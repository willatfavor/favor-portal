import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import { getMockGifts, getMockUsers } from "@/lib/mock-store";
import { hasAdminPermission } from "@/lib/api/admin-guard";
import { mapGiftRow, mapUserRow } from "@/lib/api/mappers";
import { logError } from "@/lib/logger";

export async function GET() {
  try {
    if (isDevBypass) {
      return NextResponse.json({
        success: true,
        gifts: getMockGifts(),
        users: getMockUsers(),
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

    const [giftResult, userResult] = await Promise.all([
      supabase.from("giving_cache").select("*").order("gift_date", { ascending: false }),
      supabase.from("users").select("*").order("created_at", { ascending: false }),
    ]);

    if (giftResult.error) throw giftResult.error;
    if (userResult.error) throw userResult.error;

    return NextResponse.json({
      success: true,
      gifts: (giftResult.data ?? []).map(mapGiftRow),
      users: (userResult.data ?? []).map(mapUserRow),
    });
  } catch (error) {
    logError({ event: "admin.gifts.fetch_failed", route: "/api/admin/gifts", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
