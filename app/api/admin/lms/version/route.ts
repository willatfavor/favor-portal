import { NextResponse } from "next/server";
import type { Json } from "@/types/supabase";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccessContext, requireAdminPermission } from "@/lib/admin/permissions";
import { logAdminAudit } from "@/lib/admin/audit";

interface SnapshotBody {
  courseId?: string;
  published?: boolean;
  reason?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SnapshotBody;
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

    const [{ data: courseRow, error: courseError }, { data: moduleRows, error: moduleError }] =
      await Promise.all([
        supabase.from("courses").select("*").eq("id", body.courseId).single(),
        supabase
          .from("course_modules")
          .select("*")
          .eq("course_id", body.courseId)
          .order("sort_order", { ascending: true }),
      ]);

    if (courseError || !courseRow) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (moduleError) {
      return NextResponse.json({ error: moduleError.message }, { status: 500 });
    }

    const { data: previousVersion } = await supabase
      .from("course_versions")
      .select("version_number")
      .eq("course_id", body.courseId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (previousVersion?.version_number ?? 0) + 1;
    const snapshot = {
      course: courseRow,
      modules: moduleRows ?? [],
      reason: body.reason ?? "manual_snapshot",
      createdAt: new Date().toISOString(),
    } as Json;

    const { data: inserted, error: insertError } = await supabase
      .from("course_versions")
      .insert({
        course_id: body.courseId,
        version_number: nextVersion,
        snapshot,
        published: Boolean(body.published),
        created_by: session.user.id,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to create snapshot" },
        { status: 500 }
      );
    }

    await logAdminAudit(supabase, {
      actorUserId: session.user.id,
      action: "lms.course.snapshot",
      entityType: "course",
      entityId: body.courseId,
      details: {
        versionNumber: nextVersion,
        published: Boolean(body.published),
        reason: body.reason ?? "manual_snapshot",
      },
    });

    return NextResponse.json(
      {
        success: true,
        versionId: inserted.id,
        versionNumber: inserted.version_number,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Course snapshot route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
