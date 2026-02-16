import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import {
  getMockActivity,
  getMockContent,
  getMockCourses,
  getMockGifts,
  getMockSupportTickets,
  getMockUsers,
} from "@/lib/mock-store";
import { hasAdminPermission } from "@/lib/api/admin-guard";
import { mapActivityRow, mapGiftRow, mapSupportTicketRow, mapUserRow } from "@/lib/api/mappers";
import { logError } from "@/lib/logger";

export async function GET() {
  try {
    if (isDevBypass) {
      return NextResponse.json({
        success: true,
        users: getMockUsers(),
        gifts: getMockGifts(),
        activity: getMockActivity(),
        tickets: getMockSupportTickets(),
        coursesCount: getMockCourses().length,
        contentCount: getMockContent().length,
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

    const canAccess = await hasAdminPermission(supabase, session.user.id, "admin:access");
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [
      usersResult,
      giftsResult,
      activityResult,
      ticketsResult,
      coursesCountResult,
      contentCountResult,
    ] = await Promise.all([
      supabase.from("users").select("*").order("created_at", { ascending: false }),
      supabase.from("giving_cache").select("*").order("gift_date", { ascending: false }),
      supabase.from("portal_activity_events").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("courses").select("id", { count: "exact", head: true }),
      supabase.from("portal_content").select("id", { count: "exact", head: true }),
    ]);

    if (usersResult.error) throw usersResult.error;
    if (giftsResult.error) throw giftsResult.error;
    if (activityResult.error) throw activityResult.error;
    if (ticketsResult.error) throw ticketsResult.error;
    if (coursesCountResult.error) throw coursesCountResult.error;
    if (contentCountResult.error) throw contentCountResult.error;

    return NextResponse.json({
      success: true,
      users: (usersResult.data ?? []).map(mapUserRow),
      gifts: (giftsResult.data ?? []).map(mapGiftRow),
      activity: (activityResult.data ?? []).map(mapActivityRow).filter((event) => Boolean(event.userId)),
      tickets: (ticketsResult.data ?? []).map(mapSupportTicketRow),
      coursesCount: coursesCountResult.count ?? 0,
      contentCount: contentCountResult.count ?? 0,
    });
  } catch (error) {
    logError({ event: "admin.overview.fetch_failed", route: "/api/admin/overview", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
