import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import { blackbaudClient } from "@/lib/blackbaud/client";
import { logError } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    if (isDevBypass) {
      return NextResponse.json({ success: true, syncedAt: new Date().toISOString() });
    }

    const supabase = await createClient();
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("blackbaud_constituent_id")
      .eq("id", session.user.id)
      .single();

    if (userError || !userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!userRow.blackbaud_constituent_id) {
      return NextResponse.json({ error: "No Blackbaud constituent linked to this user" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const solicitCodes = Array.isArray(body?.solicitCodes)
      ? body.solicitCodes.filter((code: unknown): code is string => typeof code === "string" && code.trim().length > 0)
      : [];

    await blackbaudClient.updateSolicitCodes(userRow.blackbaud_constituent_id, solicitCodes);

    const syncedAt = new Date().toISOString();
    await supabase.from("communication_preferences").upsert(
      {
        user_id: session.user.id,
        blackbaud_solicit_codes: solicitCodes,
        last_synced_at: syncedAt,
        updated_at: syncedAt,
      },
      { onConflict: "user_id" }
    );

    return NextResponse.json({ success: true, syncedAt });
  } catch (error) {
    logError({ event: "blackbaud.preferences.sync_failed", route: "/api/blackbaud/sync", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
