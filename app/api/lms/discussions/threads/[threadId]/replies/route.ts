import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccessContext, requireAdminPermission } from "@/lib/admin/permissions";

interface CreateReplyBody {
  body?: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;
    if (!threadId) {
      return NextResponse.json({ error: "Missing threadId" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: replyRows, error: replyError } = await supabase
      .from("course_discussion_replies")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (replyError) {
      return NextResponse.json({ error: replyError.message }, { status: 500 });
    }

    const authorIds = Array.from(new Set((replyRows ?? []).map((row) => row.author_user_id)));
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
        replies: (replyRows ?? []).map((row) => ({
          id: row.id,
          threadId: row.thread_id,
          authorUserId: row.author_user_id,
          authorName: userNameMap.get(row.author_user_id) ?? "Favor Partner",
          body: row.body,
          isInstructorReply: row.is_instructor_reply,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("LMS discussion replies GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;
    if (!threadId) {
      return NextResponse.json({ error: "Missing threadId" }, { status: 400 });
    }

    const body = (await request.json()) as CreateReplyBody;
    const content = body.body?.trim().slice(0, 3000);
    if (!content) {
      return NextResponse.json({ error: "Reply body is required" }, { status: 400 });
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
    const isInstructorReply = requireAdminPermission(access, "lms:manage");

    const { data: inserted, error: insertError } = await supabase
      .from("course_discussion_replies")
      .insert({
        thread_id: threadId,
        author_user_id: session.user.id,
        body: content,
        is_instructor_reply: isInstructorReply,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to create reply" },
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
        reply: {
          id: inserted.id,
          threadId: inserted.thread_id,
          authorUserId: inserted.author_user_id,
          authorName: authorRow ? `${authorRow.first_name} ${authorRow.last_name}`.trim() : "Favor Partner",
          body: inserted.body,
          isInstructorReply: inserted.is_instructor_reply,
          createdAt: inserted.created_at,
          updatedAt: inserted.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("LMS discussion replies POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
