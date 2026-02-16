import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAdminAudit } from "@/lib/admin/audit";
import { ADMIN_ROLES, normalizeAdminRoles } from "@/lib/admin/roles";
import { getAdminAccessContext, requireAdminPermission } from "@/lib/admin/permissions";

interface UpdateUserRolesBody {
  userId?: string;
  roleKeys?: string[];
  isAdmin?: boolean;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getAdminAccessContext(supabase, session.user.id);
    if (!requireAdminPermission(access, "users:manage")) {
      return NextResponse.json({ error: "Insufficient permission" }, { status: 403 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    let query = supabase.from("user_roles").select("user_id,role_key,updated_at").order("updated_at", {
      ascending: false,
    });
    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: roleRows, error: roleError } = await query;
    if (roleError) {
      return NextResponse.json({ error: roleError.message }, { status: 500 });
    }

    const roleMap = new Map<string, string[]>();
    for (const row of roleRows ?? []) {
      const current = roleMap.get(row.user_id) ?? [];
      current.push(row.role_key);
      roleMap.set(row.user_id, current);
    }

    return NextResponse.json(
      {
        success: true,
        assignments: Array.from(roleMap.entries()).map(([targetUserId, roleKeys]) => ({
          userId: targetUserId,
          roleKeys: normalizeAdminRoles(roleKeys),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin user roles GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UpdateUserRolesBody;
    if (!body.userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    const targetUserId = body.userId;

    const requestedRoles = body.roleKeys ?? [];
    const uniqueRequestedRoles = Array.from(new Set(requestedRoles));
    const normalizedRoles = normalizeAdminRoles(uniqueRequestedRoles);
    if (normalizedRoles.length !== uniqueRequestedRoles.length) {
      const invalidRoles = uniqueRequestedRoles.filter((role) => !ADMIN_ROLES.includes(role as never));
      return NextResponse.json(
        { error: `Invalid roles: ${invalidRoles.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getAdminAccessContext(supabase, session.user.id);
    if (!requireAdminPermission(access, "users:manage")) {
      return NextResponse.json({ error: "Insufficient permission" }, { status: 403 });
    }

    const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", targetUserId);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (normalizedRoles.length > 0) {
      const insertPayload = normalizedRoles.map((roleKey) => ({
        user_id: targetUserId,
        role_key: roleKey,
      }));
      const { error: insertError } = await supabase.from("user_roles").insert(insertPayload);
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    if (typeof body.isAdmin === "boolean") {
      const { error: userError } = await supabase
        .from("users")
        .update({ is_admin: body.isAdmin })
        .eq("id", targetUserId);
      if (userError) {
        return NextResponse.json({ error: userError.message }, { status: 500 });
      }
    }

    await logAdminAudit(supabase, {
      actorUserId: session.user.id,
      action: "users.roles.update",
      entityType: "user",
      entityId: targetUserId,
      details: {
        rolesCount: normalizedRoles.length,
        roles: normalizedRoles.join(","),
        updatedIsAdmin: typeof body.isAdmin === "boolean",
      },
    });

    const [{ data: roleRows, error: roleError }, { data: userRow, error: userError }] = await Promise.all([
      supabase.from("user_roles").select("role_key").eq("user_id", targetUserId),
      supabase.from("users").select("is_admin").eq("id", targetUserId).maybeSingle(),
    ]);

    if (roleError || userError) {
      return NextResponse.json(
        { error: roleError?.message || userError?.message || "Unable to fetch updated roles" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        userId: targetUserId,
        roleKeys: normalizeAdminRoles((roleRows ?? []).map((row) => row.role_key)),
        isAdmin: Boolean(userRow?.is_admin),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin user roles POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
