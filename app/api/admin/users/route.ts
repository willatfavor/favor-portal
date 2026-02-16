import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import { getMockUsers } from "@/lib/mock-store";
import { hasAdminPermission } from "@/lib/api/admin-guard";
import { mapUserRow } from "@/lib/api/mappers";
import { logError } from "@/lib/logger";

export async function GET() {
  try {
    if (isDevBypass) {
      return NextResponse.json({ success: true, users: getMockUsers() });
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

    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      users: (users ?? []).map(mapUserRow),
    });
  } catch (error) {
    logError({ event: "admin.users.fetch_failed", route: "/api/admin/users", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
