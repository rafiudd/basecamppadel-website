import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { uploadMedia } from "@/lib/server/storage";

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

    let folder = "";

    if (isImage) {
      if (!ALLOWED_IMAGE_TYPES[type]) {
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
      folder = "classes/photos";
    } else if (isVideo) {
      if (!ALLOWED_VIDEO_TYPES[type]) {
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
      folder = "classes/videos";
    } else {
      return NextResponse.json({ error: "Jenis file tidak valid." }, { status: 400 });
    }

    // Upload via Cloudflare R2 Storage Worker
    const { url, key } = await uploadMedia(
      folder,
      file,
      isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
    );

    return NextResponse.json({
      success: true,
      url,
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
