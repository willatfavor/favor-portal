import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAdminAudit } from "@/lib/admin/audit";
import { getAdminAccessContext, requireAdminPermission } from "@/lib/admin/permissions";
import { buildLmsRiskSignals } from "@/lib/lms/risk";

interface UpsertInterventionBody {
  id?: string;
  userId?: string;
  courseId?: string | null;
  learningPathId?: string | null;
  riskLevel?: "medium" | "high";
  riskScore?: number;
  reason?: string;
  assignedTo?: string | null;
  status?: "open" | "in_progress" | "resolved" | "dismissed";
  actionPlan?: string | null;
  dueAt?: string | null;
  lastContactedAt?: string | null;
}

function mapIntervention(row: {
  id: string;
  user_id: string;
  course_id: string | null;
  learning_path_id: string | null;
  risk_level: string;
  risk_score: number;
  reason: string;
  assigned_to: string | null;
  status: string;
  action_plan: string | null;
  last_contacted_at: string | null;
  due_at: string | null;
  resolved_at: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}) {
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    learningPathId: row.learning_path_id,
    riskLevel: row.risk_level,
    riskScore: row.risk_score,
    reason: row.reason,
    assignedTo: row.assigned_to,
    status: row.status,
    actionPlan: row.action_plan,
    lastContactedAt: row.last_contacted_at,
    dueAt: row.due_at,
    resolvedAt: row.resolved_at,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, string | number | boolean>)
        : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
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
    if (!requireAdminPermission(access, "analytics:view")) {
      return NextResponse.json({ error: "Insufficient permission" }, { status: 403 });
    }

    const [
      usersResult,
      coursesResult,
      modulesResult,
      progressResult,
      assignmentsResult,
      submissionsResult,
      interventionsResult,
    ] = await Promise.all([
      supabase.from("users").select("id,first_name,last_name,email"),
      supabase.from("courses").select("id,title"),
      supabase.from("course_modules").select("id,course_id"),
      supabase
        .from("user_course_progress")
        .select("user_id,module_id,completed,last_watched_at,completed_at"),
      supabase
        .from("course_assignments")
        .select("id,course_id,due_at,passing_percent,is_published"),
      supabase
        .from("course_assignment_submissions")
        .select("assignment_id,user_id,status,score_percent,submitted_at,graded_at"),
      supabase.from("lms_interventions").select("*").order("created_at", { ascending: false }),
    ]);

    if (
      usersResult.error ||
      coursesResult.error ||
      modulesResult.error ||
      progressResult.error ||
      assignmentsResult.error ||
      submissionsResult.error ||
      interventionsResult.error
    ) {
      return NextResponse.json(
        {
          error:
            usersResult.error?.message ||
            coursesResult.error?.message ||
            modulesResult.error?.message ||
            progressResult.error?.message ||
            assignmentsResult.error?.message ||
            submissionsResult.error?.message ||
            interventionsResult.error?.message ||
            "Failed to load intervention analytics",
        },
        { status: 500 }
      );
    }

    const users = (usersResult.data ?? []).map((row) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
    }));
    const courses = (coursesResult.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
    }));
    const modules = (modulesResult.data ?? []).map((row) => ({
      id: row.id,
      courseId: row.course_id,
    }));
    const progressRows = (progressResult.data ?? []).map((row) => ({
      userId: row.user_id,
      moduleId: row.module_id,
      completed: row.completed,
      lastWatchedAt: row.last_watched_at,
      completedAt: row.completed_at,
    }));
    const assignments = (assignmentsResult.data ?? []).map((row) => ({
      id: row.id,
      courseId: row.course_id,
      dueAt: row.due_at,
      passingPercent: row.passing_percent,
      isPublished: row.is_published,
    }));
    const submissions = (submissionsResult.data ?? []).map((row) => ({
      assignmentId: row.assignment_id,
      userId: row.user_id,
      status: row.status as "draft" | "submitted" | "returned" | "graded",
      scorePercent: row.score_percent,
      submittedAt: row.submitted_at,
      gradedAt: row.graded_at,
    }));
    const riskSignals = buildLmsRiskSignals({
      users,
      courses,
      modules,
      progressRows,
      assignments,
      submissions,
    });

    const interventionRows = interventionsResult.data ?? [];
    const openMap = new Map<string, (typeof interventionRows)[number]>();
    for (const intervention of interventionRows) {
      if (intervention.status === "resolved" || intervention.status === "dismissed") {
        continue;
      }
      const key = `${intervention.user_id}:${intervention.course_id ?? ""}`;
      if (!openMap.has(key)) {
        openMap.set(key, intervention);
      }
    }

    const candidates = riskSignals.map((signal) => {
      const linked = openMap.get(`${signal.userId}:${signal.courseId}`);
      return {
        ...signal,
        intervention: linked ? mapIntervention(linked) : null,
      };
    });

    return NextResponse.json(
      {
        success: true,
        candidates,
        interventions: interventionRows.map(mapIntervention),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("LMS interventions GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UpsertInterventionBody;
    if (!body.userId || !body.riskLevel || typeof body.riskScore !== "number" || !body.reason?.trim()) {
      return NextResponse.json(
        { error: "Missing required intervention fields" },
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
    const canManageLms = requireAdminPermission(access, "lms:manage");
    const canManageSupport = requireAdminPermission(access, "support:manage");
    if (!canManageLms && !canManageSupport) {
      return NextResponse.json({ error: "Insufficient permission" }, { status: 403 });
    }

    const payload = {
      user_id: body.userId,
      course_id: body.courseId ?? null,
      learning_path_id: body.learningPathId ?? null,
      risk_level: body.riskLevel,
      risk_score: Math.max(0, Math.min(100, Math.round(body.riskScore))),
      reason: body.reason.trim(),
      assigned_to: body.assignedTo ?? null,
      status: body.status ?? "open",
      action_plan: body.actionPlan?.trim() || null,
      due_at: body.dueAt ?? null,
      last_contacted_at: body.lastContactedAt ?? null,
      resolved_at: body.status === "resolved" ? new Date().toISOString() : null,
      metadata: {
        updatedBy: session.user.id,
      },
    };

    const query = body.id
      ? supabase.from("lms_interventions").update(payload).eq("id", body.id)
      : supabase.from("lms_interventions").insert(payload);
    const { data: row, error } = await query.select("*").single();

    if (error || !row) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to save intervention" },
        { status: 500 }
      );
    }

    await logAdminAudit(supabase, {
      actorUserId: session.user.id,
      action: body.id ? "lms.intervention.update" : "lms.intervention.create",
      entityType: "lms_intervention",
      entityId: row.id,
      details: {
        userId: row.user_id,
        courseId: row.course_id ?? "",
        status: row.status,
        riskLevel: row.risk_level,
      },
    });

    return NextResponse.json(
      {
        success: true,
        intervention: mapIntervention(row),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("LMS interventions POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
