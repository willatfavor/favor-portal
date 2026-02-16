import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccessContext, requireAdminPermission } from "@/lib/admin/permissions";

interface SubmitAssignmentBody {
  submissionText?: string;
  submissionUrl?: string;
  status?: "draft" | "submitted";
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params;
    if (!assignmentId) {
      return NextResponse.json({ error: "Missing assignmentId" }, { status: 400 });
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

    let query = supabase
      .from("course_assignment_submissions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("updated_at", { ascending: false });
    if (!canManageLms) {
      query = query.eq("user_id", session.user.id);
    }

    const { data: submissionRows, error: submissionError } = await query;
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
        submissions: (submissionRows ?? []).map((row) => mapSubmission(row, userNameMap)),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("LMS assignment submissions GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params;
    if (!assignmentId) {
      return NextResponse.json({ error: "Missing assignmentId" }, { status: 400 });
    }

    const body = (await request.json()) as SubmitAssignmentBody;
    if (!body.submissionText?.trim() && !body.submissionUrl?.trim()) {
      return NextResponse.json(
        { error: "Provide either submission text or a submission URL" },
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

    const now = new Date().toISOString();
    const status = body.status === "draft" ? "draft" : "submitted";
    const { data: upserted, error: upsertError } = await supabase
      .from("course_assignment_submissions")
      .upsert(
        {
          assignment_id: assignmentId,
          user_id: session.user.id,
          submission_text: body.submissionText?.trim() || null,
          submission_url: body.submissionUrl?.trim() || null,
          status,
          submitted_at: status === "submitted" ? now : null,
        },
        {
          onConflict: "assignment_id,user_id",
          ignoreDuplicates: false,
        }
      )
      .select("*")
      .single();

    if (upsertError || !upserted) {
      return NextResponse.json(
        { error: upsertError?.message ?? "Failed to save submission" },
        { status: 500 }
      );
    }

    const { data: userRow } = await supabase
      .from("users")
      .select("id,first_name,last_name,email")
      .eq("id", session.user.id)
      .maybeSingle();

    const userNameMap = new Map<string, { name: string; email: string }>();
    if (userRow) {
      userNameMap.set(userRow.id, {
        name: `${userRow.first_name} ${userRow.last_name}`.trim(),
        email: userRow.email,
      });
    }

    return NextResponse.json(
      {
        success: true,
        submission: mapSubmission(upserted, userNameMap),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("LMS assignment submissions POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
