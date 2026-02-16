import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import {
  getMockSupportTickets,
  updateMockSupportTicket,
} from "@/lib/mock-store";
import { hasAdminPermission } from "@/lib/api/admin-guard";
import { mapSupportMessageRow, mapSupportTicketRow } from "@/lib/api/mappers";
import { logError, logInfo } from "@/lib/logger";
import type { SupportTicket } from "@/types";

type TicketStatus = SupportTicket["status"];
const VALID_STATUSES: TicketStatus[] = ["open", "in_progress", "resolved"];

export async function GET() {
  try {
    if (isDevBypass) {
      return NextResponse.json({
        success: true,
        tickets: getMockSupportTickets(),
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

    const canManage = await hasAdminPermission(supabase, session.user.id, "support:manage");
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: ticketRows, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (ticketError) throw ticketError;

    const ticketIds = (ticketRows ?? []).map((row) => row.id);
    let messagesByTicket = new Map<string, SupportTicket["messages"]>();

    if (ticketIds.length > 0) {
      const { data: messageRows, error: messageError } = await supabase
        .from("support_messages")
        .select("*")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: true });

      if (messageError) throw messageError;

      messagesByTicket = (messageRows ?? []).reduce((acc, row) => {
        const list = acc.get(row.ticket_id) ?? [];
        list.push(mapSupportMessageRow(row));
        acc.set(row.ticket_id, list);
        return acc;
      }, new Map<string, SupportTicket["messages"]>());
    }

    const tickets = (ticketRows ?? []).map((row) => ({
      ...mapSupportTicketRow(row),
      messages: messagesByTicket.get(row.id) ?? [],
    }));

    return NextResponse.json({ success: true, tickets });
  } catch (error) {
    logError({ event: "admin.support.fetch_failed", route: "/api/admin/support", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const ticketId = String(body?.ticketId ?? "").trim();
    const status = String(body?.status ?? "") as TicketStatus;

    if (!ticketId || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Valid ticketId and status are required" }, { status: 400 });
    }

    if (isDevBypass) {
      const updated = updateMockSupportTicket(ticketId, {
        status,
        updatedAt: new Date().toISOString(),
        resolvedAt: status === "resolved" ? new Date().toISOString() : undefined,
      });

      if (!updated) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, ticket: updated });
    }

    const supabase = await createClient();
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canManage = await hasAdminPermission(supabase, session.user.id, "support:manage");
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("support_tickets")
      .update({
        status,
        resolved_at: status === "resolved" ? new Date().toISOString() : null,
      })
      .eq("id", ticketId)
      .select("*")
      .single();

    if (error) throw error;

    logInfo({
      event: "admin.support.status_updated",
      route: "/api/admin/support",
      userId: session.user.id,
      details: { ticketId, status },
    });

    return NextResponse.json({ success: true, ticket: mapSupportTicketRow(data) });
  } catch (error) {
    logError({ event: "admin.support.status_update_failed", route: "/api/admin/support", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ticketId = String(body?.ticketId ?? "").trim();
    const message = String(body?.message ?? "").trim();

    if (!ticketId || !message) {
      return NextResponse.json({ error: "ticketId and message are required" }, { status: 400 });
    }

    if (isDevBypass) {
      const existing = getMockSupportTickets().find((ticket) => ticket.id === ticketId);
      if (!existing) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }

      const messages = existing.messages ?? [];
      const updated = updateMockSupportTicket(ticketId, {
        status: existing.status === "resolved" ? existing.status : "in_progress",
        updatedAt: new Date().toISOString(),
        messages: [
          ...messages,
          {
            id: `msg-${Date.now()}`,
            sender: "staff",
            message,
            createdAt: new Date().toISOString(),
          },
        ],
      });

      return NextResponse.json({ success: true, ticket: updated });
    }

    const supabase = await createClient();
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canManage = await hasAdminPermission(supabase, session.user.id, "support:manage");
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: ticketRow, error: ticketError } = await supabase
      .from("support_tickets")
      .select("id,status")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticketRow) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const { error: messageError } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: ticketId,
        sender: "staff",
        sender_user_id: session.user.id,
        message,
      });

    if (messageError) throw messageError;

    if (ticketRow.status !== "resolved") {
      await supabase
        .from("support_tickets")
        .update({ status: "in_progress" })
        .eq("id", ticketId);
    }

    logInfo({
      event: "admin.support.reply_sent",
      route: "/api/admin/support",
      userId: session.user.id,
      details: { ticketId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError({ event: "admin.support.reply_failed", route: "/api/admin/support", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
