/**
 * Basecamp Padel storage worker: the only thing that writes to the R2 bucket.
 *
 *   PUT    /<key>   store an image   (Authorization: Bearer <STORAGE_SECRET>)
 *   DELETE /<key>   remove it        (same auth)
 *   GET    /<key>   serve it         (public, cached for a year: keys are random and never reused)
 *
 * Keys must live under players/ (admin player photos) or avatars/<user id>/ (profile photos). The
 * Next.js app decides the key; this worker only checks the secret, the folder, the type and the size.
 */

interface Env {
  BUCKET: R2Bucket;
  STORAGE_SECRET: string;
}

const MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const KEY = /^(players|avatars\/[0-9a-f-]{36})\/[0-9a-f-]{36}\.(jpe?g|png|webp|gif)$/;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** Constant-time comparison so the secret can't be guessed byte by byte from response timing. */
function authorized(request: Request, secret: string): boolean {
  const given = new TextEncoder().encode(request.headers.get("authorization") ?? "");
  const expected = new TextEncoder().encode(`Bearer ${secret}`);
  if (!secret || given.byteLength !== expected.byteLength) return false;
  return crypto.subtle.timingSafeEqual(given, expected);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const key = decodeURIComponent(new URL(request.url).pathname.slice(1));

    if (request.method === "GET" || request.method === "HEAD") {
      if (!KEY.test(key)) return new Response("Not found", { status: 404 });
      const object = await env.BUCKET.get(key);
      if (!object) return new Response("Not found", { status: 404 });
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("cache-control", "public, max-age=31536000, immutable");
      return new Response(request.method === "HEAD" ? null : object.body, { headers });
    }

    if (request.method !== "PUT" && request.method !== "DELETE") return json(405, { error: "Method not allowed" });
    if (!authorized(request, env.STORAGE_SECRET)) return json(401, { error: "Unauthorized" });
    if (!KEY.test(key)) return json(400, { error: "Invalid key" });

    if (request.method === "DELETE") {
      await env.BUCKET.delete(key);
      return json(200, { key });
    }

    const type = (request.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!IMAGE_TYPES.has(type)) return json(415, { error: "Only JPG, PNG, WebP or GIF" });
    const size = Number(request.headers.get("content-length") ?? "0");
    if (!size || size > MAX_BYTES) return json(413, { error: "Max 5 MB" });

    const body = await request.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > MAX_BYTES) return json(413, { error: "Max 5 MB" });
    await env.BUCKET.put(key, body, { httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" } });
    return json(201, { key });
  },
};
