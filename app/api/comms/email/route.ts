import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import { hasAdminPermission } from "@/lib/api/admin-guard";
import { sendEmail } from "@/lib/resend/client";
import { logError } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const to = body?.to;
    const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
    const html = typeof body?.html === "string" ? body.html : undefined;
    const text = typeof body?.text === "string" ? body.text : undefined;
    const from = typeof body?.from === "string" ? body.from : undefined;

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        { error: "to, subject, and either html or text are required" },
        { status: 400 }
      );
    }

    if (isDevBypass) {
      const result = await sendEmail({
        to,
        subject,
        from,
        ...(html ? { html, text } : { text: text as string }),
      });
      return NextResponse.json({ success: true, id: result.id });
    }

    const supabase = await createClient();
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canManageComms = await hasAdminPermission(supabase, session.user.id, "content:manage");
    if (!canManageComms) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await sendEmail({
      to,
      subject,
      from,
      ...(html ? { html, text } : { text: text as string }),
    });

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    logError({ event: "comms.email.send_failed", route: "/api/comms/email", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
