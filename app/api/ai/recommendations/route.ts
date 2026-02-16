import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import { getCourseRecommendations } from "@/lib/openrouter/client";
import { logError } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userInterests = Array.isArray(body?.userInterests)
      ? body.userInterests.filter((entry: unknown): entry is string => typeof entry === "string")
      : [];
    const completedCourses = Array.isArray(body?.completedCourses)
      ? body.completedCourses.filter((entry: unknown): entry is string => typeof entry === "string")
      : [];
    const userType = typeof body?.userType === "string" ? body.userType : "individual";

    if (isDevBypass) {
      const recommendations = await getCourseRecommendations(
        userInterests,
        completedCourses,
        userType
      );
      return NextResponse.json({ success: true, recommendations });
    }

    const supabase = await createClient();
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recommendations = await getCourseRecommendations(
      userInterests,
      completedCourses,
      userType
    );

    return NextResponse.json({ success: true, recommendations });
  } catch (error) {
    logError({ event: "ai.recommendations.failed", route: "/api/ai/recommendations", error });
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message.includes("OPENROUTER_API_KEY")) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
