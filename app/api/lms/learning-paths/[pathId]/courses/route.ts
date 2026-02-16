import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccessContext, requireAdminPermission } from "@/lib/admin/permissions";
import { logAdminAudit } from "@/lib/admin/audit";

interface AddPathCourseBody {
  courseId?: string;
  sortOrder?: number;
  required?: boolean;
}

interface RemovePathCourseBody {
  courseId?: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pathId: string }> }
) {
  try {
    const { pathId } = await params;
    if (!pathId) {
      return NextResponse.json({ error: "Missing pathId" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: rows, error } = await supabase
      .from("learning_path_courses")
      .select("*")
      .eq("learning_path_id", pathId)
      .order("sort_order", { ascending: true });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const courseIds = Array.from(new Set((rows ?? []).map((row) => row.course_id)));
    const { data: courseRows } =
      courseIds.length > 0
        ? await supabase.from("courses").select("id,title").in("id", courseIds)
        : { data: [] };
    const courseTitleMap = new Map((courseRows ?? []).map((row) => [row.id, row.title]));

    return NextResponse.json(
      {
        success: true,
        courses: (rows ?? []).map((row) => ({
          id: row.id,
          learningPathId: row.learning_path_id,
          courseId: row.course_id,
          courseTitle: courseTitleMap.get(row.course_id) ?? "Course",
          sortOrder: row.sort_order,
          required: row.required,
          createdAt: row.created_at,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Learning path courses GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pathId: string }> }
) {
  try {
    const { pathId } = await params;
    if (!pathId) {
      return NextResponse.json({ error: "Missing pathId" }, { status: 400 });
    }

    const body = (await request.json()) as AddPathCourseBody;
    if (!body.courseId) {
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
    if (!requireAdminPermission(access, "lms:manage")) {
      return NextResponse.json({ error: "Insufficient permission" }, { status: 403 });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("learning_path_courses")
      .upsert(
        {
          learning_path_id: pathId,
          course_id: body.courseId,
          sort_order: Math.max(1, Number(body.sortOrder ?? 1)),
          required: body.required ?? true,
        },
        { onConflict: "learning_path_id,course_id" }
      )
      .select("*")
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to add course to learning path" },
        { status: 500 }
      );
    }

    await logAdminAudit(supabase, {
      actorUserId: session.user.id,
      action: "lms.learning_path.course.add",
      entityType: "learning_path_course",
      entityId: inserted.id,
      details: {
        pathId,
        courseId: body.courseId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        course: {
          id: inserted.id,
          learningPathId: inserted.learning_path_id,
          courseId: inserted.course_id,
          sortOrder: inserted.sort_order,
          required: inserted.required,
          createdAt: inserted.created_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Learning path courses POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ pathId: string }> }
) {
  try {
    const { pathId } = await params;
    if (!pathId) {
      return NextResponse.json({ error: "Missing pathId" }, { status: 400 });
    }

    const body = (await request.json()) as RemovePathCourseBody;
    if (!body.courseId) {
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
    if (!requireAdminPermission(access, "lms:manage")) {
      return NextResponse.json({ error: "Insufficient permission" }, { status: 403 });
    }

    const { error } = await supabase
      .from("learning_path_courses")
      .delete()
      .eq("learning_path_id", pathId)
      .eq("course_id", body.courseId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAudit(supabase, {
      actorUserId: session.user.id,
      action: "lms.learning_path.course.remove",
      entityType: "learning_path",
      entityId: pathId,
      details: {
        courseId: body.courseId,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Learning path courses DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
