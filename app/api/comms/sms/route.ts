import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import { hasAdminPermission } from "@/lib/api/admin-guard";
import { sendSMS } from "@/lib/twilio/client";
import { logError } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const to = typeof body?.to === "string" ? body.to.trim() : "";
    const message = typeof body?.body === "string" ? body.body.trim() : "";

    if (!to || !message) {
      return NextResponse.json({ error: "to and body are required" }, { status: 400 });
    }

    if (isDevBypass) {
      const result = await sendSMS(to, message);
      return NextResponse.json({ success: true, id: result.sid });
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

    const result = await sendSMS(to, message);
    return NextResponse.json({ success: true, id: result.sid });
  } catch (error) {
    logError({ event: "comms.sms.send_failed", route: "/api/comms/sms", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
