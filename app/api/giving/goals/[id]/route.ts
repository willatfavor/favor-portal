import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import {
  deleteMockGivingGoal,
  getActiveMockUserId,
  getMockGivingGoalsForUser,
  updateMockGivingGoal,
} from "@/lib/mock-store";
import { logError, logInfo } from "@/lib/logger";
import type { GivingGoal } from "@/types";

const VALID_CATEGORIES: GivingGoal["category"][] = ["annual", "project", "monthly", "custom"];

function parseGoalUpdate(body: unknown) {
  const payload = body as Record<string, unknown>;
  const updates: {
    name?: string;
    target_amount?: number;
    current_amount?: number;
    deadline?: string;
    category?: GivingGoal["category"];
    description?: string | null;
  } = {};

  if (typeof payload?.name === "string") updates.name = payload.name.trim();
  if (payload?.targetAmount !== undefined) updates.target_amount = Number(payload.targetAmount);
  if (payload?.currentAmount !== undefined) updates.current_amount = Number(payload.currentAmount);
  if (typeof payload?.deadline === "string") updates.deadline = payload.deadline;
  if (payload?.category !== undefined) updates.category = payload.category as GivingGoal["category"];
  if (payload?.description !== undefined) {
    if (typeof payload.description === "string") {
      const trimmed = payload.description.trim();
      updates.description = trimmed.length > 0 ? trimmed : null;
    } else if (payload.description === null) {
      updates.description = null;
    }
  }

  return updates;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = parseGoalUpdate(await request.json());

    if (updates.name !== undefined && !updates.name) {
      return NextResponse.json({ error: "Goal name cannot be empty" }, { status: 400 });
    }
    if (updates.target_amount !== undefined && (!Number.isFinite(updates.target_amount) || updates.target_amount <= 0)) {
      return NextResponse.json({ error: "Target amount must be greater than 0" }, { status: 400 });
    }
    if (updates.current_amount !== undefined && (!Number.isFinite(updates.current_amount) || updates.current_amount < 0)) {
      return NextResponse.json({ error: "Current amount must be 0 or higher" }, { status: 400 });
    }
    if (updates.category !== undefined && !VALID_CATEGORIES.includes(updates.category)) {
      return NextResponse.json({ error: "Invalid goal category" }, { status: 400 });
    }

    if (isDevBypass) {
      const userId = getActiveMockUserId();
      const owned = getMockGivingGoalsForUser(userId).some((goal) => goal.id === id);
      if (!owned) {
        return NextResponse.json({ error: "Goal not found" }, { status: 404 });
      }

      const updated = updateMockGivingGoal(id, {
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.target_amount !== undefined ? { targetAmount: updates.target_amount } : {}),
        ...(updates.current_amount !== undefined ? { currentAmount: updates.current_amount } : {}),
        ...(updates.deadline !== undefined ? { deadline: updates.deadline } : {}),
        ...(updates.category !== undefined ? { category: updates.category } : {}),
        ...(updates.description !== undefined ? { description: updates.description ?? undefined } : {}),
      });

      if (!updated) {
        return NextResponse.json({ error: "Goal not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, goal: updated });
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
      .update({
        ...updates,
      })
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select("*")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Goal not found" }, { status: 404 });
      }
      throw error;
    }

    logInfo({
      event: "giving.goal.updated",
      route: "/api/giving/goals/[id]",
      userId: session.user.id,
      details: { goalId: id },
    });

    return NextResponse.json({
      success: true,
      goal: {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        targetAmount: Number(data.target_amount),
        currentAmount: Number(data.current_amount),
        deadline: data.deadline,
        category: data.category as GivingGoal["category"],
        description: data.description ?? undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (error) {
    logError({ event: "giving.goal.update_failed", route: "/api/giving/goals/[id]", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isDevBypass) {
      const userId = getActiveMockUserId();
      const owned = getMockGivingGoalsForUser(userId).some((goal) => goal.id === id);
      if (!owned) {
        return NextResponse.json({ error: "Goal not found" }, { status: 404 });
      }

      const removed = deleteMockGivingGoal(id);
      if (!removed) {
        return NextResponse.json({ error: "Goal not found" }, { status: 404 });
      }

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

    const { error } = await supabase
      .from("user_giving_goals")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) throw error;

    logInfo({
      event: "giving.goal.deleted",
      route: "/api/giving/goals/[id]",
      userId: session.user.id,
      details: { goalId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError({ event: "giving.goal.delete_failed", route: "/api/giving/goals/[id]", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
