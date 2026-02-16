import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import {
  addMockGivingGoal,
  getActiveMockUserId,
  getMockGivingGoalsForUser,
} from "@/lib/mock-store";
import { logError, logInfo } from "@/lib/logger";
import type { GivingGoal } from "@/types";

const VALID_CATEGORIES: GivingGoal["category"][] = ["annual", "project", "monthly", "custom"];

function mapGoalRow(row: {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  category: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}): GivingGoal {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    targetAmount: Number(row.target_amount),
    currentAmount: Number(row.current_amount),
    deadline: row.deadline,
    category: VALID_CATEGORIES.includes(row.category as GivingGoal["category"])
      ? (row.category as GivingGoal["category"])
      : "custom",
    description: row.description ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  try {
    if (isDevBypass) {
      const userId = getActiveMockUserId();
      return NextResponse.json({
        success: true,
        goals: getMockGivingGoalsForUser(userId),
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
      .from("user_giving_goals")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      goals: (data ?? []).map(mapGoalRow),
    });
  } catch (error) {
    logError({ event: "giving.goals.fetch_failed", route: "/api/giving/goals", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const targetAmount = Number(body?.targetAmount ?? 0);
    const currentAmount = Number(body?.currentAmount ?? 0);
    const deadline = typeof body?.deadline === "string" ? body.deadline : "";
    const category = body?.category as GivingGoal["category"];
    const description = typeof body?.description === "string" ? body.description.trim() : "";

    if (!name || !Number.isFinite(targetAmount) || targetAmount <= 0 || !deadline) {
      return NextResponse.json({ error: "Invalid goal payload" }, { status: 400 });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Invalid goal category" }, { status: 400 });
    }

    if (isDevBypass) {
      const userId = getActiveMockUserId();
      const now = new Date().toISOString();
      const goal: GivingGoal = {
        id: `goal-${Date.now()}`,
        userId,
        name,
        targetAmount,
        currentAmount: Number.isFinite(currentAmount) ? Math.max(currentAmount, 0) : 0,
        deadline,
        category,
        description: description || undefined,
        createdAt: now,
        updatedAt: now,
      };
      addMockGivingGoal(goal);
      return NextResponse.json({ success: true, goal }, { status: 201 });
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
      .from("user_giving_goals")
      .insert({
        user_id: session.user.id,
        name,
        target_amount: targetAmount,
        current_amount: Number.isFinite(currentAmount) ? Math.max(currentAmount, 0) : 0,
        deadline,
        category,
        description: description || null,
      })
      .select("*")
      .single();

    if (error) throw error;

    logInfo({
      event: "giving.goal.created",
      route: "/api/giving/goals",
      userId: session.user.id,
      details: { goalId: data.id },
    });

    return NextResponse.json({ success: true, goal: mapGoalRow(data) }, { status: 201 });
  } catch (error) {
    logError({ event: "giving.goal.create_failed", route: "/api/giving/goals", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
