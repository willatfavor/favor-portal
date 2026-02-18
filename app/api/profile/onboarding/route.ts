import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logError, logInfo } from "@/lib/logger";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("users")
      .update({
        onboarding_required: false,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq("id", session.user.id);

    if (error) {
      throw error;
    }

    logInfo({
      event: "profile.onboarding.completed",
      userId: session.user.id,
      route: "/api/profile/onboarding",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError({
      event: "profile.onboarding.failed",
      route: "/api/profile/onboarding",
      error,
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
