import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapGiftRow } from "@/lib/api/mappers";
import { logError } from "@/lib/logger";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("giving_cache")
      .select("*")
      .eq("user_id", session.user.id)
      .order("gift_date", { ascending: false });

    if (error) throw error;

    const gifts = (data ?? []).map(mapGiftRow);
    const currentYear = new Date().getFullYear();
    const years = gifts.map((gift) => new Date(gift.date).getFullYear());

    const summary = {
      totalGiven: gifts.reduce((sum, gift) => sum + gift.amount, 0),
      ytdGiven: gifts
        .filter((gift) => new Date(gift.date).getFullYear() === currentYear)
        .reduce((sum, gift) => sum + gift.amount, 0),
      giftCount: gifts.length,
      yearsActive: years.length > 0 ? currentYear - Math.min(...years) + 1 : 1,
    };

    return NextResponse.json({ success: true, gifts, summary });
  } catch (error) {
    logError({ event: "giving.history.fetch_failed", route: "/api/giving/history", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
