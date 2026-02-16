import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function isCourseComplete(
  courseId: string,
  modulesByCourse: Map<string, string[]>,
  completedModuleIds: Set<string>
) {
  const moduleIds = modulesByCourse.get(courseId) ?? [];
  if (moduleIds.length === 0) return false;
  return moduleIds.every((moduleId) => completedModuleIds.has(moduleId));
}

export async function POST(
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

    const { data: pathRow, error: pathError } = await supabase
      .from("learning_paths")
      .select("id,is_active")
      .eq("id", pathId)
      .maybeSingle();
    if (pathError || !pathRow) {
      return NextResponse.json(
        { error: pathError?.message ?? "Learning path not found" },
        { status: 404 }
      );
    }

    if (!pathRow.is_active) {
      return NextResponse.json({ error: "Learning path is not active" }, { status: 400 });
    }

    const { data: pathCourseRows, error: pathCoursesError } = await supabase
      .from("learning_path_courses")
      .select("course_id,required")
      .eq("learning_path_id", pathId)
      .order("sort_order", { ascending: true });
    if (pathCoursesError) {
      return NextResponse.json({ error: pathCoursesError.message }, { status: 500 });
    }

    const requiredCourseIds = (pathCourseRows ?? [])
      .filter((row) => row.required)
      .map((row) => row.course_id);
    const uniqueCourseIds = Array.from(new Set(requiredCourseIds));

    const [{ data: moduleRows, error: moduleError }, { data: progressRows, error: progressError }] =
      await Promise.all([
        uniqueCourseIds.length > 0
          ? supabase.from("course_modules").select("id,course_id").in("course_id", uniqueCourseIds)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from("user_course_progress")
          .select("module_id")
          .eq("user_id", session.user.id)
          .eq("completed", true),
      ]);

    if (moduleError || progressError) {
      return NextResponse.json(
        {
          error:
            moduleError?.message ||
            progressError?.message ||
            "Failed to calculate learning path progress",
        },
        { status: 500 }
      );
    }

    const modulesByCourse = (moduleRows ?? []).reduce<Map<string, string[]>>((acc, row) => {
      const values = acc.get(row.course_id) ?? [];
      values.push(row.id);
      acc.set(row.course_id, values);
      return acc;
    }, new Map<string, string[]>());
    const completedModuleIds = new Set((progressRows ?? []).map((row) => row.module_id));

    const completedCourses = uniqueCourseIds.filter((courseId) =>
      isCourseComplete(courseId, modulesByCourse, completedModuleIds)
    ).length;
    const totalCourses = uniqueCourseIds.length;
    const completionPercent = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;
    const completed = completionPercent === 100;
    const now = new Date().toISOString();

    const { data: updated, error: upsertError } = await supabase
      .from("user_learning_path_progress")
      .upsert(
        {
          learning_path_id: pathId,
          user_id: session.user.id,
          completed_courses: completedCourses,
          total_courses: totalCourses,
          completion_percent: completionPercent,
          last_calculated_at: now,
          completed_at: completed ? now : null,
          status: completed ? "completed" : "enrolled",
        },
        { onConflict: "learning_path_id,user_id" }
      )
      .select("*")
      .single();

    if (upsertError || !updated) {
      return NextResponse.json(
        { error: upsertError?.message ?? "Failed to enroll in learning path" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        progress: {
          id: updated.id,
          learningPathId: updated.learning_path_id,
          userId: updated.user_id,
          completedCourses: updated.completed_courses,
          totalCourses: updated.total_courses,
          completionPercent: updated.completion_percent,
          lastCalculatedAt: updated.last_calculated_at,
          enrolledAt: updated.enrolled_at,
          completedAt: updated.completed_at,
          status: updated.status,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Learning path enroll POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
