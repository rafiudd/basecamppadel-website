/**
 * Browser-side image compression, run before a photo is posted (keeps uploads small and under the
 * server action body limit). Client only: uses createImageBitmap + canvas.
 */

export type CompressOptions = {
  /** Longest side in px after resizing (never upscales). */
  maxSide: number;
  /** Crop to a centered square first (profile photos). */
  square?: boolean;
  /** 0–1, for JPEG/WebP. */
  quality?: number;
  /** Keep transparency (player cutouts): WebP, or PNG where the browser can't encode WebP. */
  keepAlpha?: boolean;
  /** Output format preference (e.g. "webp"). Defaults to "auto". */
  format?: "webp" | "jpeg" | "auto";
};

/** Largest original a player may pick; it's shrunk in the browser before upload. */
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/** Whether any pixel is not fully opaque (only checked when transparency is to be kept). */
function hasAlpha(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
  return false;
}

/**
 * Resizes and re-encodes an image. Opaque results are JPEG or WebP (if requested);
 * with `keepAlpha` and transparent pixels, WebP (PNG fallback).
 */
export async function compressImage(file: File, opts: CompressOptions): Promise<File> {
  const { maxSide, square = false, quality = 0.85, keepAlpha = false, format = "auto" } = opts;
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const [sx, sy, sw, sh] = square
    ? [(bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side]
    : [0, 0, bitmap.width, bitmap.height];
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: keepAlpha })!;
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
  bitmap.close();

  let blob: Blob | null;
  if (format === "webp") {
    blob = await toBlob(canvas, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") {
      blob = await toBlob(canvas, "image/jpeg", quality);
    }
  } else if (keepAlpha && hasAlpha(ctx, w, h)) {
    blob = await toBlob(canvas, "image/webp", quality);
    if (blob?.type !== "image/webp") blob = await toBlob(canvas, "image/png", 1);
  } else {
    blob = await toBlob(canvas, "image/jpeg", quality);
  }
  if (!blob) throw new Error("Gambar tidak bisa diproses.");
  // already small enough and not cropped/resized: keep the original
  if (format !== "webp" && !square && scale === 1 && blob.size >= file.size) return file;

  const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.${ext}`, { type: blob.type });
}
