import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import { getMockDashboardExperienceOverrides } from "@/lib/mock-store";
import { sanitizeDashboardRoleOverrides } from "@/lib/dashboard/experience-overrides";
import { logError } from "@/lib/logger";

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

    const { data, error } = await supabase
      .from("portal_dashboard_overrides")
      .select("role_key,highlights,actions,updated_at")
      .order("role_key", { ascending: true });

    if (error) {
      logError({ event: "dashboard.experience.fetch_failed", route: "/api/dashboard/experience", error });
      return NextResponse.json({ success: true, overrides: [] });
    }

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
    logError({ event: "dashboard.experience.unexpected_error", route: "/api/dashboard/experience", error });
    return NextResponse.json({ success: true, overrides: [] });
  }
}
