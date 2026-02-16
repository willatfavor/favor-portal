import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import { updateMockUser } from "@/lib/mock-store";
import { hasAdminPermission } from "@/lib/api/admin-guard";
import { mapUserRow } from "@/lib/api/mappers";
import { logError, logInfo } from "@/lib/logger";
import type { User } from "@/types";

const VALID_TYPES: User["constituentType"][] = [
  "individual",
  "major_donor",
  "church",
  "foundation",
  "daf",
  "ambassador",
  "volunteer",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const firstName = String(body?.firstName ?? "").trim();
    const lastName = String(body?.lastName ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const constituentType = String(body?.constituentType ?? "") as User["constituentType"];
    const isAdmin = Boolean(body?.isAdmin);

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: "First name, last name, and email are required" }, { status: 400 });
    }

    if (!VALID_TYPES.includes(constituentType)) {
      return NextResponse.json({ error: "Invalid constituent type" }, { status: 400 });
    }

    if (isDevBypass) {
      const updated = updateMockUser(id, {
        firstName,
        lastName,
        email,
        constituentType,
        isAdmin,
      });

      if (!updated) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, user: updated });
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

    const { data, error } = await supabase
      .from("users")
      .update({
        first_name: firstName,
        last_name: lastName,
        email,
        constituent_type: constituentType,
        is_admin: isAdmin,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    logInfo({
      event: "admin.users.updated",
      route: "/api/admin/users/[id]",
      userId: session.user.id,
      details: { targetUserId: id },
    });

    return NextResponse.json({ success: true, user: mapUserRow(data) });
  } catch (error) {
    logError({ event: "admin.users.update_failed", route: "/api/admin/users/[id]", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
