import "server-only";

/**
 * Image storage: Cloudflare R2 behind our storage worker (workers/storage). Server-only: the worker
 * secret never reaches the browser, and every caller checks who is signed in and builds the folder
 * itself (R2 has no row-level rules; the worker only accepts players/ and avatars/<user id>/).
 *
 * Env: STORAGE_WORKER_URL, STORAGE_WORKER_SECRET, NEXT_PUBLIC_R2_PUBLIC_URL (public base URL of the
 * bucket: the worker URL, a custom domain, or the r2.dev URL).
 */

export const MEDIA_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function env(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Storage belum dikonfigurasi (${name} kosong).`);
  return v;
}

const trimSlash = (s: string) => s.replace(/\/+$/, "");

/** Public URL of a stored object. */
export const publicUrl = (key: string) => `${trimSlash(env("NEXT_PUBLIC_R2_PUBLIC_URL"))}/${key}`;

/**
 * Stores media (image or video) via the Storage Worker and returns its public URL and key.
 */
export async function uploadMedia(
  folder: string,
  file: Blob,
  maxBytes: number
): Promise<{ url: string; key: string }> {
  const ext = MEDIA_EXT[file.type.toLowerCase()];
  if (!ext) throw new Error("Format file tidak didukung.");
  if (file.size === 0 || file.size > maxBytes) {
    throw new Error(`Ukuran file maksimal ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }

  const key = `${folder.replace(/^\/+|\/+$/g, "")}/${crypto.randomUUID()}.${ext}`;
  const res = await fetch(`${trimSlash(env("STORAGE_WORKER_URL"))}/${key}`, {
    method: "PUT",
    body: await file.arrayBuffer(),
    headers: { authorization: `Bearer ${env("STORAGE_WORKER_SECRET")}`, "content-type": file.type },
  });

  const stored = res.status === 201 ? ((await res.json().catch(() => null)) as { key?: string } | null) : null;
  if (stored?.key !== key) throw new Error(`Upload media gagal (${res.status}).`);
  return { url: publicUrl(key), key };
}

/**
 * Stores an image under `<folder>/<random>.<ext>` and returns its public URL. Only jpg/png/webp/gif;
 * the extension comes from the content type, never from the uploaded file name.
 */
export async function uploadImage(folder: string, file: Blob, maxBytes: number): Promise<string> {
  const ext = IMAGE_EXT[file.type.toLowerCase()];
  if (!ext) throw new Error("File foto harus berupa gambar (JPG, PNG, WebP).");
  const { url } = await uploadMedia(folder, file, maxBytes);
  return url;
}
