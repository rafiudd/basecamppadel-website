#!/usr/bin/env node
/**
 * One-off: copy photos from Supabase Storage (bucket "players") to Cloudflare R2 and point
 * players.photo_url / profiles.photo_url at the R2 copies. Safe to re-run (rows already on R2 are
 * skipped); --dry-run lists what would move without changing anything.
 *
 *   npm run photos:r2 -- --dry-run
 *   npm run photos:r2
 *
 * Env (.env.local): SUPABASE_DB_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET,
 * NEXT_PUBLIC_R2_PUBLIC_URL
 */
import pg from "pg";
import { AwsClient } from "aws4fetch";

const dryRun = process.argv.includes("--dry-run");
const need = (k) => {
  const v = process.env[k]?.trim();
  if (!v) {
    console.error(`✗ Env ${k} belum diisi di .env.local`);
    process.exit(1);
  }
  return v;
};

const r2 = new AwsClient({ accessKeyId: need("R2_ACCESS_KEY_ID"), secretAccessKey: need("R2_SECRET_ACCESS_KEY"), service: "s3", region: "auto" });
const bucketUrl = `https://${need("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com/${need("R2_BUCKET")}`;
const publicBase = need("NEXT_PUBLIC_R2_PUBLIC_URL").replace(/\/+$/, "");
const SUPABASE_PATH = "/storage/v1/object/public/players/";

/** Supabase object path → R2 key: avatars/<uid>/… stays as is, admin cutouts move under players/. */
const r2Key = (path) => (path.startsWith("avatars/") ? path : `players/${path}`);

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
  const key = r2Key(path);
  const newUrl = `${publicBase}/${key}`;
  if (dryRun) {
    console.log(`  ${path} → ${newUrl}`);
    continue;
  }
  const src = await fetch(oldUrl);
  if (!src.ok) {
    console.log(`  ✗ ${path}: download ${src.status}, dilewati`);
    continue;
  }
  const put = await r2.fetch(`${bucketUrl}/${key}`, {
    method: "PUT",
    body: await src.arrayBuffer(),
    headers: { "content-type": src.headers.get("content-type") ?? "image/jpeg", "cache-control": "public, max-age=31536000, immutable" },
  });
  if (!put.ok) {
    console.log(`  ✗ ${path}: upload R2 ${put.status}, dilewati`);
    continue;
  }
  await db.query(`update public.players set photo_url = $1 where photo_url = $2`, [newUrl, oldUrl]);
  await db.query(`update public.profiles set photo_url = $1 where photo_url = $2`, [newUrl, oldUrl]);
  moved++;
  console.log(`  ✓ ${path}`);
}

await db.end();
if (!dryRun) console.log(`✓ ${moved}/${rows.length} foto dipindah ke R2. File lama di Supabase Storage tidak dihapus.`);
