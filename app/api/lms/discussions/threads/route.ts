import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface CreateThreadBody {
  courseId?: string;
  cohortId?: string | null;
  moduleId?: string | null;
  title?: string;
  body?: string;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const courseId = url.searchParams.get("courseId");
    const cohortId = url.searchParams.get("cohortId");
    const moduleId = url.searchParams.get("moduleId");

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

    let query = supabase
      .from("course_discussion_threads")
      .select("*")
      .eq("course_id", courseId)
      .order("pinned", { ascending: false })
      .order("last_activity_at", { ascending: false });

    if (cohortId) {
      query = query.or(`cohort_id.is.null,cohort_id.eq.${cohortId}`);
    }

    if (moduleId) {
      query = query.eq("module_id", moduleId);
    }

    const { data: threadRows, error: threadError } = await query;
    if (threadError) {
      return NextResponse.json({ error: threadError.message }, { status: 500 });
    }

    const authorIds = Array.from(new Set((threadRows ?? []).map((row) => row.author_user_id)));
    const { data: userRows, error: userError } =
      authorIds.length > 0
        ? await supabase
            .from("users")
            .select("id,first_name,last_name")
            .in("id", authorIds)
        : { data: [], error: null };

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    const userNameMap = new Map<string, string>();
    for (const row of userRows ?? []) {
      userNameMap.set(row.id, `${row.first_name} ${row.last_name}`.trim());
    }

    return NextResponse.json(
      {
        success: true,
        threads: (threadRows ?? []).map((row) => ({
          id: row.id,
          courseId: row.course_id,
          cohortId: row.cohort_id,
          moduleId: row.module_id,
          authorUserId: row.author_user_id,
          authorName: userNameMap.get(row.author_user_id) ?? "Favor Partner",
          title: row.title,
          body: row.body,
          pinned: row.pinned,
          locked: row.locked,
          replyCount: row.reply_count,
          lastActivityAt: row.last_activity_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("LMS discussion threads GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateThreadBody;
    if (!body.courseId || !body.title?.trim() || !body.body?.trim()) {
      return NextResponse.json({ error: "Missing courseId, title, or body" }, { status: 400 });
    }

    const title = body.title.trim().slice(0, 140);
    const content = body.body.trim().slice(0, 5000);
    if (!title || !content) {
      return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("course_discussion_threads")
      .insert({
        course_id: body.courseId,
        cohort_id: body.cohortId ?? null,
        module_id: body.moduleId ?? null,
        author_user_id: session.user.id,
        title,
        body: content,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to create thread" },
        { status: 500 }
      );
    }

    const { data: authorRow } = await supabase
      .from("users")
      .select("first_name,last_name")
      .eq("id", session.user.id)
      .maybeSingle();

    return NextResponse.json(
      {
        success: true,
        thread: {
          id: inserted.id,
          courseId: inserted.course_id,
          cohortId: inserted.cohort_id,
          moduleId: inserted.module_id,
          authorUserId: inserted.author_user_id,
          authorName: authorRow ? `${authorRow.first_name} ${authorRow.last_name}`.trim() : "Favor Partner",
          title: inserted.title,
          body: inserted.body,
          pinned: inserted.pinned,
          locked: inserted.locked,
          replyCount: inserted.reply_count,
          lastActivityAt: inserted.last_activity_at,
          createdAt: inserted.created_at,
          updatedAt: inserted.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("LMS discussion threads POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
