import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccessContext, requireAdminPermission } from "@/lib/admin/permissions";
import { logAdminAudit } from "@/lib/admin/audit";

const DEFAULT_BUCKET = process.env.SUPABASE_LMS_ASSETS_BUCKET || "lms-assets";

function sanitizeFilename(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: Request) {
  try {
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
      return NextResponse.json({ error: "LMS manager permission required" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file upload" }, { status: 400 });
    }

    const safeName = sanitizeFilename(file.name || "resource");
    const filePath = `${session.user.id}/${Date.now()}-${safeName}`;

    const { data: uploaded, error: uploadError } = await supabase.storage
      .from(DEFAULT_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError || !uploaded?.path) {
      const fallbackDataUrl = await fileToDataUrl(file);
      await logAdminAudit(supabase, {
        actorUserId: session.user.id,
        action: "lms.upload.resource.fallback",
        entityType: "course_module_asset",
        details: {
          filename: file.name,
          size: file.size,
          bucket: DEFAULT_BUCKET,
          reason: uploadError?.message ?? "upload_failed",
        },
      });
      return NextResponse.json(
        {
          success: true,
          url: fallbackDataUrl,
          mode: "data-url-fallback",
          warning:
            uploadError?.message ||
            `Could not upload to bucket "${DEFAULT_BUCKET}". Using inline fallback.`,
        },
        { status: 200 }
      );
    }

    const { data: publicUrlData } = supabase.storage.from(DEFAULT_BUCKET).getPublicUrl(uploaded.path);

    await logAdminAudit(supabase, {
      actorUserId: session.user.id,
      action: "lms.upload.resource.storage",
      entityType: "course_module_asset",
      entityId: uploaded.path,
      details: {
        filename: file.name,
        size: file.size,
        bucket: DEFAULT_BUCKET,
      },
    });

    return NextResponse.json(
      {
        success: true,
        url: publicUrlData.publicUrl,
        path: uploaded.path,
        bucket: DEFAULT_BUCKET,
        mode: "storage",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resource upload route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function fileToDataUrl(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = file.type || "application/octet-stream";
  return `data:${mimeType};base64,${base64}`;
}
