import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import { blackbaudClient } from "@/lib/blackbaud/client";
import { hasAdminPermission } from "@/lib/api/admin-guard";
import { logError } from "@/lib/logger";
import { getMockConstituentByEmail } from "@/lib/blackbaud/mock-data";

export async function GET(request: NextRequest) {
  try {
    if (isDevBypass) {
      const email = request.nextUrl.searchParams.get("email")?.toLowerCase() ?? "emma@favor.local";
      const constituent = getMockConstituentByEmail(email);
      if (!constituent) {
        return NextResponse.json({ error: "Constituent not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, constituent });
    }

    const supabase = await createClient();
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestedEmail = request.nextUrl.searchParams.get("email")?.toLowerCase();
    const sessionEmail = session.user.email?.toLowerCase() ?? "";
    if (!sessionEmail) {
      return NextResponse.json({ error: "Missing session email" }, { status: 400 });
    }

    const email = requestedEmail || sessionEmail;
    if (email !== sessionEmail) {
      const canManageUsers = await hasAdminPermission(supabase, session.user.id, "users:manage");
      if (!canManageUsers) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const constituent = await blackbaudClient.getConstituentByEmail(email);
    if (!constituent) {
      return NextResponse.json({ error: "Constituent not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, constituent });
  } catch (error) {
    logError({ event: "blackbaud.constituent.fetch_failed", route: "/api/blackbaud/constituent", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
