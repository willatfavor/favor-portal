import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import { getActiveMockUserId, recordActivity } from "@/lib/mock-store";
import { logError, logInfo } from "@/lib/logger";
import type { ActivityEvent } from "@/types";

const VALID_ACTIVITY_TYPES: ActivityEvent["type"][] = [
  "gift_created",
  "course_completed",
  "course_progress",
  "content_viewed",
  "support_ticket",
  "profile_updated",
  "login",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const type = String(body?.type ?? "") as ActivityEvent["type"];
    const metadata = (body?.metadata ?? {}) as ActivityEvent["metadata"];

    if (!VALID_ACTIVITY_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid activity type" }, { status: 400 });
    }

    if (isDevBypass) {
      const userId = getActiveMockUserId();
      recordActivity({
        id: `activity-${Date.now()}`,
        type,
        userId,
        metadata,
        createdAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true }, { status: 201 });
    }

    const supabase = await createClient();
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase.from("portal_activity_events").insert({
      type,
      user_id: session.user.id,
      metadata: metadata ?? {},
    });

    if (error) throw error;

    logInfo({
      event: "activity.logged",
      route: "/api/activity",
      userId: session.user.id,
      details: { type },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    logError({ event: "activity.log_failed", route: "/api/activity", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
