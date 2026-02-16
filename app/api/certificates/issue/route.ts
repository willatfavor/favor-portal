import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";

const CERTIFICATES_BUCKET = process.env.SUPABASE_CERTIFICATES_BUCKET || "lms-certificates";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

interface IssueCertificateBody {
  courseId?: string;
}

function buildVerificationUrl(token: string): string {
  if (APP_URL) {
    return `${APP_URL.replace(/\/+$/, "")}/certificates/${token}`;
  }
  return `/certificates/${token}`;
}

function buildCertificateNumber(): string {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(
    now.getUTCDate()
  ).padStart(2, "0")}`;
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `FAV-${stamp}-${rand}`;
}

async function generateCertificatePdf(params: {
  recipientName: string;
  courseTitle: string;
  issuedAt: string;
  certificateNumber: string;
  verificationUrl: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]);
  const serif = await doc.embedFont(StandardFonts.TimesRomanBold);
  const sans = await doc.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({
    x: 24,
    y: 24,
    width: 794,
    height: 547,
    borderColor: rgb(0.17, 0.3, 0.14),
    borderWidth: 3,
    color: rgb(0.98, 0.97, 0.94),
  });

  page.drawText("FAVOR INTERNATIONAL", {
    x: 315,
    y: 525,
    size: 12,
    font: sans,
    color: rgb(0.17, 0.3, 0.14),
  });

  page.drawText("Certificate of Completion", {
    x: 245,
    y: 470,
    size: 36,
    font: serif,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText("This certifies that", {
    x: 360,
    y: 430,
    size: 14,
    font: sans,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText(params.recipientName, {
    x: 250,
    y: 385,
    size: 34,
    font: serif,
    color: rgb(0.17, 0.3, 0.14),
  });

  page.drawText("has successfully completed", {
    x: 330,
    y: 348,
    size: 14,
    font: sans,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText(params.courseTitle, {
    x: 220,
    y: 305,
    size: 24,
    font: serif,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText(`Issued ${new Date(params.issuedAt).toLocaleDateString()}`, {
    x: 325,
    y: 245,
    size: 12,
    font: sans,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText(`Certificate #${params.certificateNumber}`, {
    x: 70,
    y: 90,
    size: 10,
    font: sans,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText(`Verify: ${params.verificationUrl}`, {
    x: 70,
    y: 72,
    size: 10,
    font: sans,
    color: rgb(0.3, 0.3, 0.3),
  });

  return await doc.save();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as IssueCertificateBody;
    const courseId = body.courseId;

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

    const userId = session.user.id;

    const [{ data: courseRow, error: courseError }, { data: userRow, error: userError }] =
      await Promise.all([
        supabase.from("courses").select("id,title").eq("id", courseId).single(),
        supabase.from("users").select("first_name,last_name").eq("id", userId).single(),
      ]);

    if (courseError || !courseRow) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (userError || !userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: moduleRows, error: moduleError } = await supabase
      .from("course_modules")
      .select("id")
      .eq("course_id", courseId);

    if (moduleError || !moduleRows) {
      return NextResponse.json({ error: "Unable to validate course modules" }, { status: 500 });
    }

    const moduleIds = moduleRows.map((module) => module.id);
    if (moduleIds.length === 0) {
      return NextResponse.json({ error: "Course has no modules" }, { status: 400 });
    }

    const { data: completedRows, error: completionError } = await supabase
      .from("user_course_progress")
      .select("module_id,completed")
      .eq("user_id", userId)
      .in("module_id", moduleIds)
      .eq("completed", true);

    if (completionError) {
      return NextResponse.json({ error: "Unable to validate completion" }, { status: 500 });
    }

    const completedModuleIds = new Set((completedRows ?? []).map((entry) => entry.module_id));
    const isComplete = moduleIds.every((moduleId) => completedModuleIds.has(moduleId));

    if (!isComplete) {
      return NextResponse.json(
        { error: "Course must be fully completed before issuing certificate" },
        { status: 400 }
      );
    }

    const { data: existingCertificate } = await supabase
      .from("user_course_certificates")
      .select("issued_at,certificate_url,verification_token,certificate_number")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (existingCertificate?.verification_token && existingCertificate.certificate_url) {
      const verificationUrl = buildVerificationUrl(existingCertificate.verification_token);
      return NextResponse.json(
        {
          success: true,
          issuedAt: existingCertificate.issued_at,
          certificateUrl: existingCertificate.certificate_url,
          verificationUrl,
          certificateNumber: existingCertificate.certificate_number,
        },
        { status: 200 }
      );
    }

    const issuedAt = new Date().toISOString();
    const verificationToken = crypto.randomBytes(20).toString("hex");
    const verificationUrl = buildVerificationUrl(verificationToken);
    const certificateNumber = existingCertificate?.certificate_number || buildCertificateNumber();
    const recipientName = `${userRow.first_name} ${userRow.last_name}`.trim();
    const pdfBytes = await generateCertificatePdf({
      recipientName,
      courseTitle: courseRow.title,
      issuedAt,
      certificateNumber,
      verificationUrl,
    });

    const filePath = `${userId}/${courseId}/${verificationToken}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(CERTIFICATES_BUCKET)
      .upload(filePath, pdfBytes, {
        upsert: true,
        contentType: "application/pdf",
      });

    let certificateUrl: string;
    if (uploadError || !uploadData?.path) {
      const base64 = Buffer.from(pdfBytes).toString("base64");
      certificateUrl = `data:application/pdf;base64,${base64}`;
    } else {
      const { data: publicUrlData } = supabase.storage
        .from(CERTIFICATES_BUCKET)
        .getPublicUrl(uploadData.path);
      certificateUrl = publicUrlData.publicUrl;
    }

    const { error: upsertError } = await supabase.from("user_course_certificates").upsert(
      {
        user_id: userId,
        course_id: courseId,
        completion_rate: 100,
        issued_at: issuedAt,
        certificate_url: certificateUrl,
        verification_token: verificationToken,
        certificate_number: certificateNumber,
        metadata: {
          recipientName,
          courseTitle: courseRow.title,
          verificationUrl,
          issuedAt,
          moduleCount: moduleIds.length,
        },
      },
      { onConflict: "user_id,course_id" }
    );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        issuedAt,
        certificateUrl,
        verificationUrl,
        certificateNumber,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Issue certificate route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
