import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import {
  addMockCommunicationSendLog,
  getMockCommunicationSendLogs,
  getMockTemplates,
  setMockTemplates,
} from "@/lib/mock-store";
import { hasAdminPermission } from "@/lib/api/admin-guard";
import { mapTemplateRow } from "@/lib/api/mappers";
import { logError, logInfo } from "@/lib/logger";
import { sendEmail } from "@/lib/resend/client";
import { sendSMS } from "@/lib/twilio/client";
import type { CommunicationTemplate } from "@/types";
import type { Json } from "@/types/supabase";

const VALID_CHANNELS: CommunicationTemplate["channel"][] = ["email", "sms", "direct_mail"];
const VALID_STATUS: CommunicationTemplate["status"][] = ["active", "draft"];

function renderTemplate(content: string, variables: Record<string, string>): string {
  return Object.entries(variables).reduce((result, [key, value]) => {
    return result.replaceAll(`{{${key}}}`, value);
  }, content);
}

export async function GET() {
  try {
    if (isDevBypass) {
      return NextResponse.json({
        success: true,
        templates: getMockTemplates(),
        sendLog: getMockCommunicationSendLogs(),
      });
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

    const [{ data: templateRows, error: templateError }, { data: logRows, error: logRowsError }] = await Promise.all([
      supabase.from("communication_templates").select("*").order("updated_at", { ascending: false }),
      supabase.from("communication_send_logs").select("*").order("sent_at", { ascending: false }).limit(100),
    ]);

    if (templateError) throw templateError;
    if (logRowsError) throw logRowsError;

    const sendLog = (logRows ?? []).map((row) => ({
      id: row.id,
      templateId: row.template_id ?? "",
      templateName: row.template_name,
      channel: row.channel as CommunicationTemplate["channel"],
      sentAt: row.sent_at,
    }));

    return NextResponse.json({
      success: true,
      templates: (templateRows ?? []).map(mapTemplateRow),
      sendLog,
    });
  } catch (error) {
    logError({ event: "admin.communications.fetch_failed", route: "/api/admin/communications", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const channel = String(body?.channel ?? "") as CommunicationTemplate["channel"];
    const name = String(body?.name ?? "").trim();
    const subject = typeof body?.subject === "string" ? body.subject.trim() : undefined;
    const content = String(body?.content ?? "").trim();
    const status = String(body?.status ?? "draft") as CommunicationTemplate["status"];

    if (!VALID_CHANNELS.includes(channel) || !name || !content || !VALID_STATUS.includes(status)) {
      return NextResponse.json({ error: "Invalid template payload" }, { status: 400 });
    }

    if (isDevBypass) {
      const created: CommunicationTemplate = {
        id: `template-${Date.now()}`,
        channel,
        name,
        subject,
        content,
        status,
        updatedAt: new Date().toISOString(),
      };

      setMockTemplates([created, ...getMockTemplates()]);
      return NextResponse.json({ success: true, template: created }, { status: 201 });
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
      .from("communication_templates")
      .insert({
        channel,
        name,
        subject: subject ?? null,
        content,
        status,
        created_by: session.user.id,
        updated_by: session.user.id,
      })
      .select("*")
      .single();

    if (error) throw error;

    logInfo({
      event: "admin.communications.template_created",
      route: "/api/admin/communications",
      userId: session.user.id,
      details: { templateId: data.id },
    });

    return NextResponse.json({ success: true, template: mapTemplateRow(data) }, { status: 201 });
  } catch (error) {
    logError({ event: "admin.communications.template_create_failed", route: "/api/admin/communications", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const templateId = String(body?.templateId ?? "").trim();

    if (!templateId) {
      return NextResponse.json({ error: "templateId is required" }, { status: 400 });
    }

    if (isDevBypass) {
      const template = getMockTemplates().find((item) => item.id === templateId);
      if (!template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }

      addMockCommunicationSendLog({
        id: `send-${crypto.randomUUID()}`,
        templateId: template.id,
        templateName: template.name,
        channel: template.channel,
        sentAt: new Date().toISOString(),
      });

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

    const [{ data: templateRow, error: templateError }, { data: senderRow, error: senderError }] = await Promise.all([
      supabase
        .from("communication_templates")
        .select("id,name,channel,subject,content")
        .eq("id", templateId)
        .single(),
      supabase
        .from("users")
        .select("first_name,last_name,email,phone,constituent_type")
        .eq("id", session.user.id)
        .single(),
    ]);

    if (templateError || !templateRow) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    if (senderError || !senderRow) {
      return NextResponse.json({ error: "Sender profile not found" }, { status: 404 });
    }

    const variables = {
      firstName: senderRow.first_name,
      lastName: senderRow.last_name,
      email: senderRow.email,
      amount: "$100.00",
      date: new Date().toLocaleDateString(),
      designation: "Where Most Needed",
      constituentType: senderRow.constituent_type,
    };

    const content = renderTemplate(templateRow.content, variables);
    const subject = templateRow.subject
      ? renderTemplate(templateRow.subject, variables)
      : templateRow.name;
    const requestedRecipient =
      typeof body?.recipient === "string" && body.recipient.trim().length > 0
        ? body.recipient.trim()
        : null;
    let recipient = requestedRecipient;
    let status: "sent" | "queued" | "failed" = "sent";
    let metadata: Record<string, string | number | boolean | null> = { mode: "test" };

    try {
      if (templateRow.channel === "email") {
        recipient = recipient || senderRow.email;
        if (!recipient) {
          return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
        }
        const result = await sendEmail({
          to: recipient,
          subject,
          text: content,
        });
        metadata = { ...metadata, provider: "resend", providerMessageId: result.id };
      } else if (templateRow.channel === "sms") {
        recipient = recipient || senderRow.phone || null;
        if (!recipient) {
          return NextResponse.json({ error: "Recipient phone is required" }, { status: 400 });
        }
        const result = await sendSMS(recipient, content);
        metadata = { ...metadata, provider: "twilio", providerMessageId: result.sid };
      } else {
        status = "queued";
        metadata = { ...metadata, dispatch: "manual_direct_mail" };
      }
    } catch (dispatchError) {
      status = "failed";
      metadata = {
        ...metadata,
        error: dispatchError instanceof Error ? dispatchError.message : String(dispatchError),
      };
    }

    const { error } = await supabase.from("communication_send_logs").insert({
      template_id: templateRow.id,
      template_name: templateRow.name,
      channel: templateRow.channel,
      recipient,
      sent_by: session.user.id,
      status,
      metadata: metadata as Json,
    });

    if (error) throw error;
    if (status === "failed") {
      return NextResponse.json(
        { error: "Dispatch failed. Check communication send logs for details." },
        { status: 502 }
      );
    }

    logInfo({
      event: "admin.communications.test_send",
      route: "/api/admin/communications",
      userId: session.user.id,
      details: { templateId, status, channel: templateRow.channel },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError({ event: "admin.communications.test_send_failed", route: "/api/admin/communications", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
