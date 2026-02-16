import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import { getMockTemplates, setMockTemplates } from "@/lib/mock-store";
import { hasAdminPermission } from "@/lib/api/admin-guard";
import { mapTemplateRow } from "@/lib/api/mappers";
import { logError, logInfo } from "@/lib/logger";
import type { CommunicationTemplate } from "@/types";

const VALID_CHANNELS: CommunicationTemplate["channel"][] = ["email", "sms", "direct_mail"];
const VALID_STATUS: CommunicationTemplate["status"][] = ["active", "draft"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (isDevBypass) {
      const templates = getMockTemplates();
      const current = templates.find((entry) => entry.id === id);
      if (!current) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }

      const updated: CommunicationTemplate = {
        ...current,
        ...body,
        updatedAt: new Date().toISOString(),
      };

      const next = templates.map((entry) => (entry.id === id ? updated : entry));
      setMockTemplates(next);
      return NextResponse.json({ success: true, template: updated });
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

    const channel = body?.channel as CommunicationTemplate["channel"] | undefined;
    const status = body?.status as CommunicationTemplate["status"] | undefined;

    if (channel && !VALID_CHANNELS.includes(channel)) {
      return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
    }

    if (status && !VALID_STATUS.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updatePayload = {
      ...(body?.channel !== undefined ? { channel: body.channel } : {}),
      ...(body?.name !== undefined ? { name: body.name } : {}),
      ...(body?.subject !== undefined ? { subject: body.subject ?? null } : {}),
      ...(body?.content !== undefined ? { content: body.content } : {}),
      ...(body?.status !== undefined ? { status: body.status } : {}),
      updated_by: session.user.id,
    };

    const { data, error } = await supabase
      .from("communication_templates")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    logInfo({
      event: "admin.communications.template_updated",
      route: "/api/admin/communications/[id]",
      userId: session.user.id,
      details: { templateId: id },
    });

    return NextResponse.json({ success: true, template: mapTemplateRow(data) });
  } catch (error) {
    logError({ event: "admin.communications.template_update_failed", route: "/api/admin/communications/[id]", error });
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
      const templates = getMockTemplates();
      const next = templates.filter((entry) => entry.id !== id);
      if (next.length === templates.length) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }
      setMockTemplates(next);
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

    const { error } = await supabase.from("communication_templates").delete().eq("id", id);
    if (error) throw error;

    logInfo({
      event: "admin.communications.template_deleted",
      route: "/api/admin/communications/[id]",
      userId: session.user.id,
      details: { templateId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError({ event: "admin.communications.template_delete_failed", route: "/api/admin/communications/[id]", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
