import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccessContext, requireAdminPermission } from "@/lib/admin/permissions";

interface ThreadUpdateBody {
  pinned?: boolean;
  locked?: boolean;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;
    if (!threadId) {
      return NextResponse.json({ error: "Missing threadId" }, { status: 400 });
    }

    const body = (await request.json()) as ThreadUpdateBody;
    const updates: Record<string, boolean> = {};
    if (typeof body.pinned === "boolean") updates.pinned = body.pinned;
    if (typeof body.locked === "boolean") updates.locked = body.locked;
    if (Object.keys(updates).length === 0) {
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

    const { data, error } = await supabase
      .from("course_discussion_threads")
      .update(updates)
      .eq("id", threadId)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        thread: {
          id: data.id,
          pinned: data.pinned,
          locked: data.locked,
          updatedAt: data.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("LMS discussion thread PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
