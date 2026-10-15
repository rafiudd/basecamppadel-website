import "server-only";
import { AwsClient } from "aws4fetch";

/**
 * Image storage on Cloudflare R2 (S3 API). Server-only: the secret key never reaches the browser, so
 * every caller checks who is signed in and builds the object key itself (R2 has no row-level rules).
 *
 * Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, NEXT_PUBLIC_R2_PUBLIC_URL
 * (the bucket's public base URL: a custom domain like https://img.basecamppadel.id or the r2.dev URL).
 */

const IMAGE_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

function env(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Storage belum dikonfigurasi (${name} kosong).`);
  return v;
}

let client: AwsClient | null = null;
function r2() {
  client ??= new AwsClient({
    accessKeyId: env("R2_ACCESS_KEY_ID"),
    secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    service: "s3",
    region: "auto",
  });
  return client;
}

const objectUrl = (key: string) => `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com/${env("R2_BUCKET")}/${key}`;

/** Public URL of a stored object. */
export const publicUrl = (key: string) => `${env("NEXT_PUBLIC_R2_PUBLIC_URL").replace(/\/+$/, "")}/${key}`;

/**
 * Stores an image under `<folder>/<random>.<ext>` and returns its public URL. Only jpg/png/webp/gif;
 * the extension comes from the content type, never from the uploaded file name.
 */
export async function uploadImage(folder: string, file: Blob, maxBytes: number): Promise<string> {
  const ext = IMAGE_EXT[file.type];
  if (!ext) throw new Error("File foto harus berupa gambar (JPG, PNG, WebP).");
  if (file.size === 0 || file.size > maxBytes) throw new Error(`Foto maksimal ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  const key = `${folder.replace(/^\/+|\/+$/g, "")}/${crypto.randomUUID()}.${ext}`;
  const res = await r2().fetch(objectUrl(key), {
    method: "PUT",
    body: await file.arrayBuffer(),
    headers: { "content-type": file.type, "cache-control": "public, max-age=31536000, immutable" },
  });
  if (!res.ok) throw new Error(`Upload foto gagal (${res.status}).`);
  return publicUrl(key);
}
