import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import { getMockContent, setMockContent } from "@/lib/mock-store";
import { hasAdminPermission } from "@/lib/api/admin-guard";
import { mapContentRow } from "@/lib/api/mappers";
import { logError, logInfo } from "@/lib/logger";
import type { ContentItem } from "@/types";

const VALID_TYPES: ContentItem["type"][] = ["report", "update", "resource", "prayer", "story"];
const VALID_ACCESS: ContentItem["accessLevel"][] = [
  "all",
  "partner",
  "major_donor",
  "church",
  "foundation",
  "daf",
  "ambassador",
  "volunteer",
];
const VALID_STATUS: NonNullable<ContentItem["status"]>[] = ["draft", "published"];

function parseContentInput(body: unknown): {
  title: string;
  excerpt: string;
  body: string;
  type: ContentItem["type"];
  accessLevel: ContentItem["accessLevel"];
  author: string;
  tags: string[];
  coverImage?: string;
  fileUrl?: string;
  status: NonNullable<ContentItem["status"]>;
} | null {
  const input = body as Partial<ContentItem> & { status?: ContentItem["status"] };
  const title = String(input?.title ?? "").trim();
  const excerpt = String(input?.excerpt ?? "").trim();
  const contentBody = String(input?.body ?? "").trim();
  const type = input?.type;
  const accessLevel = input?.accessLevel;
  const author = String(input?.author ?? "Favor International").trim() || "Favor International";
  const tags = Array.isArray(input?.tags)
    ? input.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];
  const status = (input?.status ?? "draft") as NonNullable<ContentItem["status"]>;

  if (!title || !excerpt || !contentBody) return null;
  if (!type || !VALID_TYPES.includes(type)) return null;
  if (!accessLevel || !VALID_ACCESS.includes(accessLevel)) return null;
  if (!VALID_STATUS.includes(status)) return null;

  return {
    title,
    excerpt,
    body: contentBody,
    type,
    accessLevel,
    author,
    tags,
    coverImage: input?.coverImage,
    fileUrl: input?.fileUrl,
    status,
  };
}

export async function GET() {
  try {
    if (isDevBypass) {
      const items = getMockContent().map((item) => ({ ...item, status: item.status ?? "published" }));
      return NextResponse.json({ success: true, items });
    }

    const supabase = await createClient();
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canManage = await hasAdminPermission(supabase, session.user.id, "content:manage");
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("portal_content")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      items: (data ?? []).map(mapContentRow),
    });
  } catch (error) {
    logError({ event: "admin.content.fetch_failed", route: "/api/admin/content", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = parseContentInput(await request.json());
    if (!payload) {
      return NextResponse.json({ error: "Invalid content payload" }, { status: 400 });
    }

    if (isDevBypass) {
      const created: ContentItem = {
        id: `content-${Date.now()}`,
        title: payload.title,
        excerpt: payload.excerpt,
        body: payload.body,
        type: payload.type,
        accessLevel: payload.accessLevel,
        date: new Date().toISOString(),
        author: payload.author,
        tags: payload.tags,
        coverImage: payload.coverImage,
        fileUrl: payload.fileUrl,
        status: payload.status,
      };
      setMockContent([created, ...getMockContent()]);
      return NextResponse.json({ success: true, item: created }, { status: 201 });
    }

    const supabase = await createClient();
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canManage = await hasAdminPermission(supabase, session.user.id, "content:manage");
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("portal_content")
      .insert({
        title: payload.title,
        excerpt: payload.excerpt,
        body: payload.body,
        type: payload.type,
        access_level: payload.accessLevel,
        status: payload.status,
        author: payload.author,
        tags: payload.tags,
        cover_image: payload.coverImage ?? null,
        file_url: payload.fileUrl ?? null,
        published_at: payload.status === "published" ? new Date().toISOString() : null,
        created_by: session.user.id,
        updated_by: session.user.id,
      })
      .select("*")
      .single();

    if (error) throw error;

    logInfo({
      event: "admin.content.created",
      route: "/api/admin/content",
      userId: session.user.id,
      details: { contentId: data.id },
    });

    return NextResponse.json({ success: true, item: mapContentRow(data) }, { status: 201 });
  } catch (error) {
    logError({ event: "admin.content.create_failed", route: "/api/admin/content", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
