#!/usr/bin/env node
/**
 * One-off: copy photos from Supabase Storage (bucket "players") to Cloudflare R2 and point
 * players.photo_url / profiles.photo_url at the R2 copies. Safe to re-run (rows already on R2 are
 * skipped); --dry-run lists what would move without changing anything.
 *
 *   npm run photos:r2 -- --dry-run
 *   npm run photos:r2
 *
 * Env (.env.local): SUPABASE_DB_URL, STORAGE_WORKER_URL, STORAGE_WORKER_SECRET, NEXT_PUBLIC_R2_PUBLIC_URL
 */
import pg from "pg";

const dryRun = process.argv.includes("--dry-run");
const need = (k) => {
  const v = process.env[k]?.trim();
  if (!v) {
    console.error(`✗ Env ${k} belum diisi di .env.local`);
    process.exit(1);
  }
  return v;
};

const workerUrl = need("STORAGE_WORKER_URL").replace(/\/+$/, "");
const workerSecret = need("STORAGE_WORKER_SECRET");
const publicBase = need("NEXT_PUBLIC_R2_PUBLIC_URL").replace(/\/+$/, "");
const SUPABASE_PATH = "/storage/v1/object/public/players/";
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/**
 * Supabase object path → R2 key in the worker's format: avatars/<uid>/<uuid>.<ext> stays as is,
 * anything else (admin cutouts) becomes players/<new uuid>.<ext from the content type>.
 */
const r2Key = (path, type) =>
  new RegExp(`^avatars/${UUID}/${UUID}\\.(jpe?g|png|webp|gif)$`).test(path) ? path : `players/${crypto.randomUUID()}.${EXT[type] ?? "jpg"}`;

const db = new pg.Client({ connectionString: need("SUPABASE_DB_URL"), ssl: { rejectUnauthorized: false } });
await db.connect();

const { rows } = await db.query(
  `select distinct photo_url from (
     select photo_url from public.players union all select photo_url from public.profiles
   ) x where photo_url like $1`,
  [`%${SUPABASE_PATH}%`],
);
console.log(`${rows.length} foto di Supabase Storage${dryRun ? " (dry run)" : ""}`);

let moved = 0;
for (const { photo_url: oldUrl } of rows) {
  const path = decodeURIComponent(oldUrl.slice(oldUrl.indexOf(SUPABASE_PATH) + SUPABASE_PATH.length));
  if (dryRun) {
    console.log(`  ${path}`);
    continue;
  }
  const src = await fetch(oldUrl);
  if (!src.ok) {
    console.log(`  ✗ ${path}: download ${src.status}, dilewati`);
    continue;
  }
  const type = (src.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim();
  const key = r2Key(path, type);
  const newUrl = `${publicBase}/${key}`;
  const put = await fetch(`${workerUrl}/${key}`, {
    method: "PUT",
    body: await src.arrayBuffer(),
    headers: { authorization: `Bearer ${workerSecret}`, "content-type": type },
  });
  if (put.status !== 201) {
    console.log(`  ✗ ${path}: upload ${put.status} ${await put.text()}, dilewati`);
    continue;
  }
  await db.query(`update public.players set photo_url = $1 where photo_url = $2`, [newUrl, oldUrl]);
  await db.query(`update public.profiles set photo_url = $1 where photo_url = $2`, [newUrl, oldUrl]);
  moved++;
  console.log(`  ✓ ${path} → ${newUrl}`);
}

await db.end();
if (!dryRun) console.log(`✓ ${moved}/${rows.length} foto dipindah ke R2. File lama di Supabase Storage tidak dihapus.`);
