import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import { getMockContent } from "@/lib/mock-store";
import { mapContentRow } from "@/lib/api/mappers";
import { logError } from "@/lib/logger";

export async function GET() {
  try {
    if (isDevBypass) {
      const items = getMockContent().map((item) => ({ ...item, status: item.status ?? "published" }));
      return NextResponse.json({ success: true, items }, { status: 200 });
    }

    const supabase = await createClient();
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("portal_content")
      .select("*")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      items: (data ?? []).map(mapContentRow),
    });
  } catch (error) {
    logError({ event: "content.fetch_failed", route: "/api/content", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
