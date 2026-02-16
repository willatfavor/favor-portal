import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import { blackbaudClient } from "@/lib/blackbaud/client";
import { hasAdminPermission } from "@/lib/api/admin-guard";
import { logError } from "@/lib/logger";
import { getMockGiftsByConstituentId } from "@/lib/blackbaud/mock-data";

export async function GET(request: NextRequest) {
  try {
    if (isDevBypass) {
      const constituentId = request.nextUrl.searchParams.get("constituentId") ?? "BB-001-IND";
      return NextResponse.json({
        success: true,
        gifts: getMockGiftsByConstituentId(constituentId),
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

    const requestedConstituentId = request.nextUrl.searchParams.get("constituentId");

    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("blackbaud_constituent_id")
      .eq("id", session.user.id)
      .single();

    if (userError || !userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const constituentId = requestedConstituentId || userRow.blackbaud_constituent_id;
    if (!constituentId) {
      return NextResponse.json({ success: true, gifts: [] });
    }

    if (requestedConstituentId && requestedConstituentId !== userRow.blackbaud_constituent_id) {
      const canManageUsers = await hasAdminPermission(supabase, session.user.id, "users:manage");
      if (!canManageUsers) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const gifts = await blackbaudClient.getGiftsByConstituentId(constituentId);
    return NextResponse.json({ success: true, gifts });
  } catch (error) {
    logError({ event: "blackbaud.gifts.fetch_failed", route: "/api/blackbaud/gifts", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
