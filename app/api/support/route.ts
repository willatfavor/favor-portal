import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import {
  addMockSupportTicket,
  getMockSupportTickets,
  recordActivity,
  getActiveMockUserId,
  getMockUserById,
} from "@/lib/mock-store";
import { mapSupportMessageRow, mapSupportTicketRow } from "@/lib/api/mappers";
import { logError, logInfo } from "@/lib/logger";
import type { SupportTicket } from "@/types";

function attachMessages(tickets: SupportTicket[]): SupportTicket[] {
  return tickets.map((ticket) => ({
    ...ticket,
    messages: ticket.messages ?? [],
  }));
}

export async function GET() {
  try {
    if (isDevBypass) {
      return NextResponse.json({
        success: true,
        tickets: attachMessages(getMockSupportTickets()),
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

    const { data: ticketRows, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("requester_user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (ticketError) throw ticketError;

    const ticketIds = (ticketRows ?? []).map((row) => row.id);

    let messageMap = new Map<string, SupportTicket["messages"]>();

    if (ticketIds.length > 0) {
      const { data: messageRows, error: messageError } = await supabase
        .from("support_messages")
        .select("*")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: true });

      if (messageError) throw messageError;

      messageMap = (messageRows ?? []).reduce((acc, row) => {
        const list = acc.get(row.ticket_id) ?? [];
        list.push(mapSupportMessageRow(row));
        acc.set(row.ticket_id, list);
        return acc;
      }, new Map<string, SupportTicket["messages"]>());
    }

    const tickets = (ticketRows ?? []).map((row) => ({
      ...mapSupportTicketRow(row),
      messages: messageMap.get(row.id) ?? [],
    }));

    return NextResponse.json({ success: true, tickets });
  } catch (error) {
    logError({ event: "support.fetch_failed", route: "/api/support", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const category = String(body?.category ?? "").trim();
    const subject = String(body?.subject ?? "").trim();
    const message = String(body?.message ?? "").trim();

    if (!category || !subject || !message) {
      return NextResponse.json({ error: "Category, subject, and message are required" }, { status: 400 });
    }

    if (isDevBypass) {
      const userId = getActiveMockUserId();
      const user = getMockUserById(userId);
      const ticket: SupportTicket = {
        id: `ticket-${Date.now()}`,
        requesterUserId: userId,
        requesterName: user ? `${user.firstName} ${user.lastName}` : undefined,
        requesterEmail: user?.email,
        category,
        subject,
        message,
        status: "open",
        priority: "normal",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [
          {
            id: `msg-${Date.now()}`,
            sender: "partner",
            message,
            createdAt: new Date().toISOString(),
          },
        ],
      };

      addMockSupportTicket(ticket);
      recordActivity({
        id: `activity-${Date.now()}`,
        type: "support_ticket",
        userId,
        createdAt: new Date().toISOString(),
        metadata: { category, subject },
      });

      return NextResponse.json({ success: true, ticket }, { status: 201 });
    }

    const supabase = await createClient();
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const { data: userRow } = await supabase
      .from("users")
      .select("first_name,last_name,email")
      .eq("id", userId)
      .maybeSingle();

    const { data: ticketRow, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({
        requester_user_id: userId,
        requester_name: userRow ? `${userRow.first_name} ${userRow.last_name}` : null,
        requester_email: userRow?.email ?? null,
        category,
        subject,
        message,
        status: "open",
        priority: "normal",
      })
      .select("*")
      .single();

    if (ticketError) throw ticketError;

    const { data: messageRow, error: messageError } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: ticketRow.id,
        sender: "partner",
        sender_user_id: userId,
        message,
      })
      .select("*")
      .single();

    if (messageError) throw messageError;

    await supabase.from("portal_activity_events").insert({
      user_id: userId,
      type: "support_ticket",
      metadata: { category, subject },
    });

    const ticket = {
      ...mapSupportTicketRow(ticketRow),
      messages: [mapSupportMessageRow(messageRow)],
    };

    logInfo({
      event: "support.ticket_created",
      route: "/api/support",
      userId,
      details: { category },
    });

    return NextResponse.json({ success: true, ticket }, { status: 201 });
  } catch (error) {
    logError({ event: "support.ticket_create_failed", route: "/api/support", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
