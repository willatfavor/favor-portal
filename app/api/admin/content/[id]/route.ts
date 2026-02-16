import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import { getMockContent, setMockContent } from "@/lib/mock-store";
import { hasAdminPermission } from "@/lib/api/admin-guard";
import { mapContentRow } from "@/lib/api/mappers";
import { logError, logInfo } from "@/lib/logger";
import type { ContentItem } from "@/types";

const VALID_STATUS: NonNullable<ContentItem["status"]>[] = ["draft", "published"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<ContentItem>;

    if (isDevBypass) {
      const current = getMockContent();
      const target = current.find((item) => item.id === id);
      if (!target) {
        return NextResponse.json({ error: "Content not found" }, { status: 404 });
      }

      const next = current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...body,
              status: body.status ?? item.status ?? "published",
              date:
                body.status === "published" && (item.status ?? "published") !== "published"
                  ? new Date().toISOString()
                  : item.date,
            }
          : item
      );

      setMockContent(next);
      const updated = next.find((item) => item.id === id);
      return NextResponse.json({ success: true, item: updated });
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

    const status = body.status as ContentItem["status"] | undefined;
    if (status && !VALID_STATUS.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updatePayload = {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.excerpt !== undefined ? { excerpt: body.excerpt } : {}),
      ...(body.body !== undefined ? { body: body.body } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.accessLevel !== undefined ? { access_level: body.accessLevel } : {}),
      ...(body.author !== undefined ? { author: body.author } : {}),
      ...(body.tags !== undefined ? { tags: body.tags } : {}),
      ...(body.coverImage !== undefined ? { cover_image: body.coverImage ?? null } : {}),
      ...(body.fileUrl !== undefined ? { file_url: body.fileUrl ?? null } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(status === "published" ? { published_at: new Date().toISOString() } : {}),
      updated_by: session.user.id,
    };

    const { data, error } = await supabase
      .from("portal_content")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    logInfo({
      event: "admin.content.updated",
      route: "/api/admin/content/[id]",
      userId: session.user.id,
      details: { contentId: id },
    });

    return NextResponse.json({ success: true, item: mapContentRow(data) });
  } catch (error) {
    logError({ event: "admin.content.update_failed", route: "/api/admin/content/[id]", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isDevBypass) {
      const current = getMockContent();
      const next = current.filter((item) => item.id !== id);
      if (next.length === current.length) {
        return NextResponse.json({ error: "Content not found" }, { status: 404 });
      }
      setMockContent(next);
      return NextResponse.json({ success: true });
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

    const { error } = await supabase.from("portal_content").delete().eq("id", id);
    if (error) throw error;

    logInfo({
      event: "admin.content.deleted",
      route: "/api/admin/content/[id]",
      userId: session.user.id,
      details: { contentId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError({ event: "admin.content.delete_failed", route: "/api/admin/content/[id]", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
