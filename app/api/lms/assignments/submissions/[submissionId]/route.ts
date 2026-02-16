import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccessContext, requireAdminPermission } from "@/lib/admin/permissions";
import { logAdminAudit } from "@/lib/admin/audit";

interface GradeSubmissionBody {
  scorePercent?: number | null;
  feedback?: string | null;
  status?: "returned" | "graded";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const { submissionId } = await params;
    if (!submissionId) {
      return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
    }

    const body = (await request.json()) as GradeSubmissionBody;
    const hasScore = typeof body.scorePercent === "number";
    const hasFeedback = typeof body.feedback === "string";
    const hasStatus = typeof body.status === "string";
    if (!hasScore && !hasFeedback && !hasStatus) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
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

    const nextStatus = body.status ?? "graded";
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("course_assignment_submissions")
      .update({
        score_percent: hasScore ? Math.max(0, Math.min(100, Number(body.scorePercent))) : undefined,
        feedback: hasFeedback ? body.feedback?.trim() || null : undefined,
        status: nextStatus,
        grader_user_id: session.user.id,
        graded_at: nextStatus === "graded" ? now : null,
      })
      .eq("id", submissionId)
      .select("*")
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message ?? "Failed to grade submission" },
        { status: 500 }
      );
    }

    await logAdminAudit(supabase, {
      actorUserId: session.user.id,
      action: "lms.assignment.grade",
      entityType: "assignment_submission",
      entityId: submissionId,
      details: {
        status: updated.status,
        scorePercent: updated.score_percent ?? "",
      },
    });

    return NextResponse.json(
      {
        success: true,
        submission: {
          id: updated.id,
          assignmentId: updated.assignment_id,
          userId: updated.user_id,
          submissionText: updated.submission_text,
          submissionUrl: updated.submission_url,
          status: updated.status,
          scorePercent: updated.score_percent,
          graderUserId: updated.grader_user_id,
          feedback: updated.feedback,
          submittedAt: updated.submitted_at,
          gradedAt: updated.graded_at,
          createdAt: updated.created_at,
          updatedAt: updated.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("LMS assignment submission PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
