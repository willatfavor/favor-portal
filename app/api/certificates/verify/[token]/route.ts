import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ valid: false, error: "Missing token" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_course_certificates")
      .select("issued_at,completion_rate,certificate_url,verification_token,certificate_number,metadata")
      .eq("verification_token", token)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ valid: false, error: "Certificate not found" }, { status: 404 });
    }

    const metadata =
      data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
        ? data.metadata
        : {};

    return NextResponse.json(
      {
        valid: true,
        issuedAt: data.issued_at,
        completionRate: data.completion_rate,
        certificateUrl: data.certificate_url,
        certificateNumber: data.certificate_number,
        recipientName:
          typeof metadata["recipientName"] === "string"
            ? (metadata["recipientName"] as string)
            : "Favor Partner",
        courseTitle:
          typeof metadata["courseTitle"] === "string"
            ? (metadata["courseTitle"] as string)
            : "Course",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Certificate verify route error:", error);
    return NextResponse.json({ valid: false, error: "Internal server error" }, { status: 500 });
  }
}
