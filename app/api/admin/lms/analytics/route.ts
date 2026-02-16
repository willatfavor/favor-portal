import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccessContext, requireAdminPermission } from "@/lib/admin/permissions";

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

    const [coursesResult, modulesResult, progressResult, attemptsResult, eventsResult, certificatesResult] =
      await Promise.all([
        supabase.from("courses").select("id,title"),
        supabase.from("course_modules").select("id,course_id,title,sort_order,module_type"),
        supabase.from("user_course_progress").select("user_id,module_id,completed,watch_time_seconds,completed_at,last_watched_at"),
        supabase.from("user_quiz_attempts").select("module_id,score_percent,passed"),
        supabase.from("course_module_events").select("module_id,event_type,user_id,watch_time_seconds,created_at"),
        supabase.from("user_course_certificates").select("course_id,user_id,issued_at"),
      ]);

    if (
      coursesResult.error ||
      modulesResult.error ||
      progressResult.error ||
      attemptsResult.error ||
      eventsResult.error ||
      certificatesResult.error
    ) {
      const errorMessage =
        coursesResult.error?.message ||
        modulesResult.error?.message ||
        progressResult.error?.message ||
        attemptsResult.error?.message ||
        eventsResult.error?.message ||
        certificatesResult.error?.message ||
        "Analytics query failed";
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const courses = coursesResult.data ?? [];
    const modules = modulesResult.data ?? [];
    const progressRows = progressResult.data ?? [];
    const attempts = attemptsResult.data ?? [];
    const events = eventsResult.data ?? [];
    const certificates = certificatesResult.data ?? [];

    const cohortMap = new Map<string, { learners: Set<string>; completions: number }>();
    const firstSeenByUser = new Map<string, string>();
    for (const row of progressRows) {
      const timestamp = row.completed_at ?? row.last_watched_at;
      if (!timestamp) continue;
      const cohort = timestamp.slice(0, 7);
      const current = firstSeenByUser.get(row.user_id);
      if (!current || timestamp < current) {
        firstSeenByUser.set(row.user_id, timestamp);
      }
      if (row.completed) {
        const cohortEntry = cohortMap.get(cohort) ?? { learners: new Set<string>(), completions: 0 };
        cohortEntry.completions += 1;
        cohortMap.set(cohort, cohortEntry);
      }
    }

    firstSeenByUser.forEach((timestamp, userId) => {
      const cohort = timestamp.slice(0, 7);
      const cohortEntry = cohortMap.get(cohort) ?? { learners: new Set<string>(), completions: 0 };
      cohortEntry.learners.add(userId);
      cohortMap.set(cohort, cohortEntry);
    });

    const cohorts = Array.from(cohortMap.entries())
      .map(([cohort, entry]) => ({
        cohort,
        learners: entry.learners.size,
        completions: entry.completions,
      }))
      .sort((a, b) => (a.cohort > b.cohort ? 1 : -1));

    const moduleStats = modules.map((module) => {
      const rows = progressRows.filter((row) => row.module_id === module.id);
      const started = new Set<string>(rows.map((row) => row.user_id));
      const completed = rows.filter((row) => row.completed);
      const completionRate = started.size > 0 ? Math.round((completed.length / started.size) * 100) : 0;
      const avgWatchSeconds = rows.length > 0
        ? Math.round(rows.reduce((sum, row) => sum + row.watch_time_seconds, 0) / rows.length)
        : 0;

      return {
        moduleId: module.id,
        title: module.title,
        courseId: module.course_id,
        moduleType: module.module_type,
        sortOrder: module.sort_order,
        startedLearners: started.size,
        completedLearners: completed.length,
        completionRate,
        avgWatchSeconds,
      };
    });

    const dropoff = moduleStats
      .filter((row) => row.startedLearners > 0)
      .sort((a, b) => a.completionRate - b.completionRate)
      .slice(0, 12);

    const quizPerformance = modules
      .filter((module) => module.module_type === "quiz")
      .map((module) => {
        const attemptsForModule = attempts.filter((attempt) => attempt.module_id === module.id);
        const passedCount = attemptsForModule.filter((attempt) => attempt.passed).length;
        const passRate =
          attemptsForModule.length > 0 ? Math.round((passedCount / attemptsForModule.length) * 100) : 0;
        const avgScore =
          attemptsForModule.length > 0
            ? Math.round(
                attemptsForModule.reduce((sum, attempt) => sum + attempt.score_percent, 0) /
                  attemptsForModule.length
              )
            : 0;

        return {
          moduleId: module.id,
          title: module.title,
          attempts: attemptsForModule.length,
          passRate,
          avgScore,
        };
      })
      .sort((a, b) => b.attempts - a.attempts || b.passRate - a.passRate);

    const watchBehavior = modules
      .map((module) => {
        const moduleEvents = events.filter((event) => event.module_id === module.id);
        const totalWatchSeconds = moduleEvents.reduce(
          (sum, event) => sum + event.watch_time_seconds,
          0
        );
        const learners = new Set(moduleEvents.map((event) => event.user_id));
        const avgWatchSeconds =
          moduleEvents.length > 0 ? Math.round(totalWatchSeconds / moduleEvents.length) : 0;

        return {
          moduleId: module.id,
          title: module.title,
          learners: learners.size,
          totalWatchSeconds,
          avgWatchSeconds,
        };
      })
      .sort((a, b) => b.totalWatchSeconds - a.totalWatchSeconds);

    return NextResponse.json(
      {
        success: true,
        summary: {
          totalCourses: courses.length,
          totalModules: modules.length,
          totalCertificates: certificates.length,
          totalQuizAttempts: attempts.length,
          totalEvents: events.length,
        },
        cohorts,
        dropoff,
        quizPerformance,
        watchBehavior,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("LMS analytics route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
