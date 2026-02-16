import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccessContext, requireAdminPermission } from "@/lib/admin/permissions";
import { logAdminAudit } from "@/lib/admin/audit";

interface CreateAssignmentBody {
  courseId?: string;
  moduleId?: string | null;
  title?: string;
  description?: string;
  instructions?: string;
  dueAt?: string | null;
  pointsPossible?: number;
  passingPercent?: number;
  isPublished?: boolean;
}

function mapAssignment(row: {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  description: string;
  instructions: string | null;
  due_at: string | null;
  points_possible: number;
  passing_percent: number;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}) {
  return {
    id: row.id,
    courseId: row.course_id,
    moduleId: row.module_id,
    title: row.title,
    description: row.description,
    instructions: row.instructions,
    dueAt: row.due_at,
    pointsPossible: row.points_possible,
    passingPercent: row.passing_percent,
    isPublished: row.is_published,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSubmission(
  row: {
    id: string;
    assignment_id: string;
    user_id: string;
    submission_text: string | null;
    submission_url: string | null;
    status: string;
    score_percent: number | null;
    grader_user_id: string | null;
    feedback: string | null;
    submitted_at: string | null;
    graded_at: string | null;
    created_at: string;
    updated_at: string;
  },
  userNameMap: Map<string, { name: string; email: string }>
) {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    userId: row.user_id,
    userName: userNameMap.get(row.user_id)?.name ?? "Favor Partner",
    userEmail: userNameMap.get(row.user_id)?.email ?? "",
    submissionText: row.submission_text,
    submissionUrl: row.submission_url,
    status: row.status,
    scorePercent: row.score_percent,
    graderUserId: row.grader_user_id,
    feedback: row.feedback,
    submittedAt: row.submitted_at,
    gradedAt: row.graded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: Request) {
  try {
    const courseId = new URL(request.url).searchParams.get("courseId");
    if (!courseId) {
      return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
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

    let assignmentQuery = supabase
      .from("course_assignments")
      .select("*")
      .eq("course_id", courseId)
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (!canManageLms) {
      assignmentQuery = assignmentQuery.eq("is_published", true);
    }

    const { data: assignmentRows, error: assignmentError } = await assignmentQuery;
    if (assignmentError) {
      return NextResponse.json({ error: assignmentError.message }, { status: 500 });
    }

    const assignmentIds = (assignmentRows ?? []).map((row) => row.id);
    if (assignmentIds.length === 0) {
      return NextResponse.json({ success: true, assignments: [], submissions: [] }, { status: 200 });
    }

    let submissionQuery = supabase
      .from("course_assignment_submissions")
      .select("*")
      .in("assignment_id", assignmentIds)
      .order("updated_at", { ascending: false });
    if (!canManageLms) {
      submissionQuery = submissionQuery.eq("user_id", session.user.id);
    }

    const { data: submissionRows, error: submissionError } = await submissionQuery;
    if (submissionError) {
      return NextResponse.json({ error: submissionError.message }, { status: 500 });
    }

    const userIds = Array.from(
      new Set(
        (submissionRows ?? [])
          .flatMap((row) => [row.user_id, row.grader_user_id])
          .filter((id): id is string => Boolean(id))
      )
    );
    const { data: userRows, error: userError } =
      userIds.length > 0
        ? await supabase.from("users").select("id,first_name,last_name,email").in("id", userIds)
        : { data: [], error: null };

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    const userNameMap = new Map<string, { name: string; email: string }>();
    for (const row of userRows ?? []) {
      userNameMap.set(row.id, {
        name: `${row.first_name} ${row.last_name}`.trim(),
        email: row.email,
      });
    }

    return NextResponse.json(
      {
        success: true,
        assignments: (assignmentRows ?? []).map(mapAssignment),
        submissions: (submissionRows ?? []).map((row) => mapSubmission(row, userNameMap)),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("LMS assignments GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateAssignmentBody;
    if (!body.courseId || !body.title?.trim()) {
      return NextResponse.json({ error: "Missing courseId or title" }, { status: 400 });
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
    if (!requireAdminPermission(access, "lms:manage")) {
      return NextResponse.json({ error: "Insufficient permission" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("course_assignments")
      .insert({
        course_id: body.courseId,
        module_id: body.moduleId ?? null,
        title: body.title.trim(),
        description: body.description?.trim() || "",
        instructions: body.instructions?.trim() || null,
        due_at: body.dueAt || null,
        points_possible: Math.max(0, Number(body.pointsPossible ?? 100)),
        passing_percent: Math.max(0, Math.min(100, Number(body.passingPercent ?? 70))),
        is_published: Boolean(body.isPublished),
        created_by: session.user.id,
      })
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to create assignment" },
        { status: 500 }
      );
    }

    await logAdminAudit(supabase, {
      actorUserId: session.user.id,
      action: "lms.assignment.create",
      entityType: "assignment",
      entityId: data.id,
      details: {
        courseId: body.courseId,
        title: data.title,
        published: data.is_published,
      },
    });

    return NextResponse.json({ success: true, assignment: mapAssignment(data) }, { status: 200 });
  } catch (error) {
    console.error("LMS assignments POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
