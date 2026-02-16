import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import { blackbaudClient } from "@/lib/blackbaud/client";
import { hasAdminPermission } from "@/lib/api/admin-guard";
import { logError } from "@/lib/logger";
import type { BlackbaudConstituent } from "@/types";

export async function POST(request: NextRequest) {
  try {
    if (isDevBypass) {
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

    const canManageUsers = await hasAdminPermission(supabase, session.user.id, "users:manage");
    if (!canManageUsers) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const constituentId = typeof body?.constituentId === "string" ? body.constituentId.trim() : "";
    const updateData = (body?.data ?? {}) as Partial<BlackbaudConstituent>;

    if (!constituentId) {
      return NextResponse.json({ error: "constituentId is required" }, { status: 400 });
    }

    await blackbaudClient.updateConstituent(constituentId, updateData);
    return NextResponse.json({ success: true });
  } catch (error) {
    logError({ event: "blackbaud.constituent.update_failed", route: "/api/blackbaud/update", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
