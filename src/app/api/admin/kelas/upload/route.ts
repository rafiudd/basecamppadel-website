import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth";

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const ALLOWED_VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

function getAdminStorage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase credentials belum dikonfigurasi di server.");
  }
  return createClient(url, serviceKey);
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mediaType = (formData.get("mediaType") as string) || "image";

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    }

    const type = file.type.toLowerCase();
    const isImage = mediaType === "image" || type.startsWith("image/");
    const isVideo = mediaType === "video" || type.startsWith("video/");

    let ext = "";
    let folder = "";

    if (isImage) {
      ext = ALLOWED_IMAGE_TYPES[type];
      if (!ext) {
        return NextResponse.json(
          { error: "Format gambar tidak didukung. Gunakan JPG, PNG, WebP, atau GIF." },
          { status: 400 }
        );
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: `Ukuran foto maksimal ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB.` },
          { status: 400 }
        );
      }
      folder = "photos";
    } else if (isVideo) {
      ext = ALLOWED_VIDEO_TYPES[type];
      if (!ext) {
        return NextResponse.json(
          { error: "Format video tidak didukung. Gunakan MP4, WebM, atau MOV." },
          { status: 400 }
        );
      }
      if (file.size > MAX_VIDEO_BYTES) {
        return NextResponse.json(
          { error: `Ukuran video maksimal ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB.` },
          { status: 400 }
        );
      }
      folder = "videos";
    } else {
      return NextResponse.json({ error: "Jenis file tidak valid." }, { status: 400 });
    }

    const key = `${folder}/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const supabase = getAdminStorage();
    const { data, error } = await supabase.storage.from("classes").upload(key, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      console.error("Storage upload error:", error);
      return NextResponse.json({ error: `Upload gagal: ${error.message}` }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("classes").getPublicUrl(key);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      key,
      name: file.name,
      size: file.size,
      mediaType: isVideo ? "video" : "image",
    });
  } catch (err: any) {
    console.error("Upload handler error:", err);
    return NextResponse.json(
      { error: err?.message || "Terjadi kesalahan saat mengunggah file." },
      { status: err?.message?.includes("akses admin") ? 403 : 500 }
    );
  }
}
