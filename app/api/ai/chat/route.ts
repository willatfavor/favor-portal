import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import { answerFavorQuestion } from "@/lib/openrouter/client";
import { logError } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    if (!question) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    if (isDevBypass) {
      const answer = await answerFavorQuestion(question);
      return NextResponse.json({ success: true, answer });
    }

    const supabase = await createClient();
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const answer = await answerFavorQuestion(question);
    return NextResponse.json({ success: true, answer });
  } catch (error) {
    logError({ event: "ai.chat.failed", route: "/api/ai/chat", error });
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message.includes("OPENROUTER_API_KEY")) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
