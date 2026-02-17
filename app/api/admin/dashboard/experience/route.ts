import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import {
  getMockDashboardExperienceOverrides,
  setMockDashboardExperienceOverrides,
  upsertMockDashboardExperienceOverride,
} from "@/lib/mock-store";
import { hasAdminPermission } from "@/lib/api/admin-guard";
import {
  compactDashboardRoleOverride,
  DASHBOARD_ROLE_KEYS,
  sanitizeDashboardRoleOverride,
  sanitizeDashboardRoleOverrides,
} from "@/lib/dashboard/experience-overrides";
import { logError, logInfo } from "@/lib/logger";
import type { Json } from "@/types/database";

export async function GET() {
  try {
    if (isDevBypass) {
      return NextResponse.json({
        success: true,
        overrides: sanitizeDashboardRoleOverrides(getMockDashboardExperienceOverrides()),
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

    const canManage = await hasAdminPermission(supabase, session.user.id, "content:manage");
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("portal_dashboard_overrides")
      .select("role_key,highlights,actions,updated_at")
      .order("role_key", { ascending: true });

    if (error) throw error;

    const overrides = sanitizeDashboardRoleOverrides(
      (data ?? []).map((row) => ({
        roleKey: row.role_key,
        highlights: row.highlights,
        actions: row.actions,
        updatedAt: row.updated_at,
      }))
    );

    return NextResponse.json({ success: true, overrides });
  } catch (error) {
    logError({
      event: "admin.dashboard_experience.fetch_failed",
      route: "/api/admin/dashboard/experience",
      error,
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const override = sanitizeDashboardRoleOverride(body);
    if (!override || !DASHBOARD_ROLE_KEYS.includes(override.roleKey)) {
      return NextResponse.json({ error: "Invalid override payload" }, { status: 400 });
    }

    const compactOverride = compactDashboardRoleOverride(override);

    if (isDevBypass) {
      upsertMockDashboardExperienceOverride({
        ...compactOverride,
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        override: compactOverride,
        overrides: sanitizeDashboardRoleOverrides(getMockDashboardExperienceOverrides()),
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

    const canManage = await hasAdminPermission(supabase, session.user.id, "content:manage");
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: updatedRow, error: updateError } = await supabase
      .from("portal_dashboard_overrides")
      .update({
        highlights: compactOverride.highlights as Json,
        actions: compactOverride.actions as Json,
        updated_by: session.user.id,
      })
      .eq("role_key", compactOverride.roleKey)
      .select("role_key,highlights,actions,updated_at")
      .maybeSingle();

    if (updateError) throw updateError;

    let data = updatedRow;
    if (!data) {
      const { data: insertedRow, error: insertError } = await supabase
        .from("portal_dashboard_overrides")
        .insert({
          role_key: compactOverride.roleKey,
          highlights: compactOverride.highlights as Json,
          actions: compactOverride.actions as Json,
          updated_by: session.user.id,
        })
        .select("role_key,highlights,actions,updated_at")
        .single();

      if (insertError) throw insertError;
      data = insertedRow;
    }

    if (!data) {
      return NextResponse.json({ error: "Unable to persist override" }, { status: 500 });
    }

    logInfo({
      event: "admin.dashboard_experience.updated",
      route: "/api/admin/dashboard/experience",
      userId: session.user.id,
      details: { roleKey: compactOverride.roleKey },
    });

    return NextResponse.json({
      success: true,
      override: sanitizeDashboardRoleOverride(
        {
          roleKey: data.role_key,
          highlights: data.highlights,
          actions: data.actions,
          updatedAt: data.updated_at,
        },
        compactOverride.roleKey
      ),
    });
  } catch (error) {
    logError({
      event: "admin.dashboard_experience.update_failed",
      route: "/api/admin/dashboard/experience",
      error,
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const roleKey = typeof body?.roleKey === "string" ? body.roleKey : "";
    if (!DASHBOARD_ROLE_KEYS.includes(roleKey as (typeof DASHBOARD_ROLE_KEYS)[number])) {
      return NextResponse.json({ error: "Invalid role key" }, { status: 400 });
    }

    if (isDevBypass) {
      const next = getMockDashboardExperienceOverrides().filter((entry) => entry.roleKey !== roleKey);
      setMockDashboardExperienceOverrides(next);
      return NextResponse.json({
        success: true,
        overrides: sanitizeDashboardRoleOverrides(next),
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

    const canManage = await hasAdminPermission(supabase, session.user.id, "content:manage");
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase.from("portal_dashboard_overrides").delete().eq("role_key", roleKey);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    logError({
      event: "admin.dashboard_experience.delete_failed",
      route: "/api/admin/dashboard/experience",
      error,
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
