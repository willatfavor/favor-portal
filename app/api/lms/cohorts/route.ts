import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAdminAudit } from "@/lib/admin/audit";
import { getAdminAccessContext, requireAdminPermission } from "@/lib/admin/permissions";

interface CohortMutationBody {
  action?: "create" | "join" | "leave";
  courseId?: string;
  cohortId?: string;
  name?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
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

    const { data: cohortRows, error: cohortError } = await supabase
      .from("course_cohorts")
      .select("*")
      .eq("course_id", courseId)
      .eq("is_active", true)
      .order("starts_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (cohortError) {
      return NextResponse.json({ error: cohortError.message }, { status: 500 });
    }

    const cohortIds = (cohortRows ?? []).map((row) => row.id);
    const { data: memberRows, error: memberError } =
      cohortIds.length > 0
        ? await supabase
            .from("course_cohort_members")
            .select("cohort_id,user_id,membership_role")
            .in("cohort_id", cohortIds)
        : { data: [], error: null };

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    const membersByCohort = new Map<string, number>();
    const membershipByCohort = new Map<string, string>();
    for (const row of memberRows ?? []) {
      membersByCohort.set(row.cohort_id, (membersByCohort.get(row.cohort_id) ?? 0) + 1);
      if (row.user_id === session.user.id) {
        membershipByCohort.set(row.cohort_id, row.membership_role);
      }
    }

    return NextResponse.json(
      {
        success: true,
        cohorts: (cohortRows ?? []).map((row) => ({
          id: row.id,
          courseId: row.course_id,
          name: row.name,
          description: row.description,
          startsAt: row.starts_at,
          endsAt: row.ends_at,
          isActive: row.is_active,
          createdBy: row.created_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          membersCount: membersByCohort.get(row.id) ?? 0,
          isMember: membershipByCohort.has(row.id),
          membershipRole: membershipByCohort.get(row.id) ?? null,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("LMS cohorts GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CohortMutationBody;
    if (!body.action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (body.action === "create") {
      if (!body.courseId || !body.name?.trim()) {
        return NextResponse.json({ error: "Missing courseId or name" }, { status: 400 });
      }

      const access = await getAdminAccessContext(supabase, session.user.id);
      if (!requireAdminPermission(access, "lms:manage")) {
        return NextResponse.json({ error: "Insufficient permission" }, { status: 403 });
      }

      const { data, error } = await supabase
        .from("course_cohorts")
        .insert({
          course_id: body.courseId,
          name: body.name.trim(),
          description: body.description?.trim() || null,
          starts_at: body.startsAt || null,
          ends_at: body.endsAt || null,
          created_by: session.user.id,
        })
        .select("*")
        .single();

      if (error || !data) {
        return NextResponse.json({ error: error?.message ?? "Failed to create cohort" }, { status: 500 });
      }

      await supabase.from("course_cohort_members").upsert(
        {
          cohort_id: data.id,
          user_id: session.user.id,
          membership_role: "instructor",
        },
        { onConflict: "cohort_id,user_id" }
      );

      await logAdminAudit(supabase, {
        actorUserId: session.user.id,
        action: "lms.cohort.create",
        entityType: "cohort",
        entityId: data.id,
        details: {
          courseId: body.courseId,
          name: body.name.trim(),
        },
      });

      return NextResponse.json(
        {
          success: true,
          cohort: {
            id: data.id,
            courseId: data.course_id,
            name: data.name,
            description: data.description,
            startsAt: data.starts_at,
            endsAt: data.ends_at,
            isActive: data.is_active,
            createdBy: data.created_by,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            membersCount: 1,
            isMember: true,
            membershipRole: "instructor",
          },
        },
        { status: 200 }
      );
    }

    if (!body.cohortId) {
      return NextResponse.json({ error: "Missing cohortId" }, { status: 400 });
    }

    if (body.action === "join") {
      const { error } = await supabase.from("course_cohort_members").upsert(
        {
          cohort_id: body.cohortId,
          user_id: session.user.id,
          membership_role: "learner",
        },
        { onConflict: "cohort_id,user_id" }
      );

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (body.action === "leave") {
      const { error } = await supabase
        .from("course_cohort_members")
        .delete()
        .eq("cohort_id", body.cohortId)
        .eq("user_id", session.user.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("LMS cohorts POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
