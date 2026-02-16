import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccessContext, requireAdminPermission } from "@/lib/admin/permissions";
import { logAdminAudit } from "@/lib/admin/audit";

interface CreateLearningPathBody {
  title?: string;
  description?: string;
  audience?: "all" | "partner" | "major_donor" | "church" | "foundation" | "ambassador";
  estimatedHours?: number;
  isActive?: boolean;
}

function calculateCourseCompletion(
  courseId: string,
  modulesByCourse: Map<string, string[]>,
  completedModuleIds: Set<string>
) {
  const moduleIds = modulesByCourse.get(courseId) ?? [];
  if (moduleIds.length === 0) return false;
  return moduleIds.every((moduleId) => completedModuleIds.has(moduleId));
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
    const canManageLms = requireAdminPermission(access, "lms:manage");

    let pathsQuery = supabase
      .from("learning_paths")
      .select("*")
      .order("created_at", { ascending: false });
    if (!canManageLms) {
      pathsQuery = pathsQuery.eq("is_active", true);
    }

    const { data: pathRows, error: pathError } = await pathsQuery;
    if (pathError) {
      return NextResponse.json({ error: pathError.message }, { status: 500 });
    }

    const pathIds = (pathRows ?? []).map((row) => row.id);
    if (pathIds.length === 0) {
      return NextResponse.json({ success: true, paths: [] }, { status: 200 });
    }

    const [pathCourseResult, progressResult, modulesResult] = await Promise.all([
      supabase
        .from("learning_path_courses")
        .select("*")
        .in("learning_path_id", pathIds)
        .order("sort_order", { ascending: true }),
      supabase.from("user_learning_path_progress").select("*").eq("user_id", session.user.id),
      supabase.from("course_modules").select("id,course_id"),
    ]);

    if (pathCourseResult.error || progressResult.error || modulesResult.error) {
      return NextResponse.json(
        {
          error:
            pathCourseResult.error?.message ||
            progressResult.error?.message ||
            modulesResult.error?.message ||
            "Failed to load learning path details",
        },
        { status: 500 }
      );
    }

    const pathCourses = pathCourseResult.data ?? [];
    const courseIds = Array.from(new Set(pathCourses.map((row) => row.course_id)));
    const [{ data: courseRows, error: courseError }, { data: progressRows, error: userProgressError }] =
      await Promise.all([
        courseIds.length > 0
          ? supabase.from("courses").select("id,title").in("id", courseIds)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from("user_course_progress")
          .select("module_id,completed")
          .eq("user_id", session.user.id)
          .eq("completed", true),
      ]);

    if (courseError || userProgressError) {
      return NextResponse.json(
        {
          error:
            courseError?.message ||
            userProgressError?.message ||
            "Failed to load learning path progress",
        },
        { status: 500 }
      );
    }

    const modulesByCourse = (modulesResult.data ?? []).reduce<Map<string, string[]>>((acc, row) => {
      const entries = acc.get(row.course_id) ?? [];
      entries.push(row.id);
      acc.set(row.course_id, entries);
      return acc;
    }, new Map<string, string[]>());
    const completedModuleIds = new Set((progressRows ?? []).map((row) => row.module_id));
    const courseTitleMap = new Map<string, string>((courseRows ?? []).map((row) => [row.id, row.title]));
    const progressMap = new Map<string, (typeof progressResult.data)[number]>(
      (progressResult.data ?? []).map((row) => [row.learning_path_id, row])
    );

    const pathCourseMap = pathCourses.reduce<Map<string, typeof pathCourses>>((acc, row) => {
      const entries = acc.get(row.learning_path_id) ?? [];
      entries.push(row);
      acc.set(row.learning_path_id, entries);
      return acc;
    }, new Map<string, typeof pathCourses>());

    const payload = (pathRows ?? []).map((path) => {
      const pathCourseRows = pathCourseMap.get(path.id) ?? [];
      const mappedCourses = pathCourseRows.map((entry) => ({
        id: entry.id,
        learningPathId: entry.learning_path_id,
        courseId: entry.course_id,
        courseTitle: courseTitleMap.get(entry.course_id) ?? "Course",
        sortOrder: entry.sort_order,
        required: entry.required,
        completed: calculateCourseCompletion(entry.course_id, modulesByCourse, completedModuleIds),
      }));
      const requiredCourses = mappedCourses.filter((entry) => entry.required);
      const totalCourses = requiredCourses.length;
      const completedCourses = requiredCourses.filter((entry) => entry.completed).length;
      const completionPercent = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;
      const progressRow = progressMap.get(path.id);

      return {
        id: path.id,
        title: path.title,
        description: path.description,
        audience: path.audience,
        isActive: path.is_active,
        estimatedHours: path.estimated_hours,
        createdBy: path.created_by,
        createdAt: path.created_at,
        updatedAt: path.updated_at,
        coursesCount: mappedCourses.length,
        completionPercent,
        isEnrolled: Boolean(progressRow),
        status: progressRow?.status ?? "enrolled",
        courses: mappedCourses,
      };
    });

    const updates = payload
      .filter((path) => path.isEnrolled)
      .map((path) => ({
        learning_path_id: path.id,
        user_id: session.user.id,
        completed_courses: Math.round(((path.completionPercent ?? 0) * (path.coursesCount || 0)) / 100),
        total_courses: path.coursesCount,
        completion_percent: path.completionPercent ?? 0,
        last_calculated_at: new Date().toISOString(),
        completed_at: (path.completionPercent ?? 0) === 100 ? new Date().toISOString() : null,
        status: (path.completionPercent ?? 0) === 100 ? "completed" : "enrolled",
      }));
    if (updates.length > 0) {
      await supabase
        .from("user_learning_path_progress")
        .upsert(updates, { onConflict: "learning_path_id,user_id" });
    }

    return NextResponse.json({ success: true, paths: payload }, { status: 200 });
  } catch (error) {
    console.error("Learning paths GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateLearningPathBody;
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Missing title" }, { status: 400 });
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
      .from("learning_paths")
      .insert({
        title: body.title.trim(),
        description: body.description?.trim() || null,
        audience: body.audience ?? "all",
        estimated_hours: body.estimatedHours ?? null,
        is_active: body.isActive ?? true,
        created_by: session.user.id,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to create learning path" },
        { status: 500 }
      );
    }

    await logAdminAudit(supabase, {
      actorUserId: session.user.id,
      action: "lms.learning_path.create",
      entityType: "learning_path",
      entityId: inserted.id,
      details: {
        title: inserted.title,
        audience: inserted.audience,
      },
    });

    return NextResponse.json(
      {
        success: true,
        path: {
          id: inserted.id,
          title: inserted.title,
          description: inserted.description,
          audience: inserted.audience,
          isActive: inserted.is_active,
          estimatedHours: inserted.estimated_hours,
          createdBy: inserted.created_by,
          createdAt: inserted.created_at,
          updatedAt: inserted.updated_at,
          coursesCount: 0,
          completionPercent: 0,
          isEnrolled: false,
          status: "enrolled",
          courses: [],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Learning paths POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
