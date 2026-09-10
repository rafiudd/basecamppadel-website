#!/usr/bin/env node
/**
 * Basecamp Padel — DB CLI
 *
 *   npm run db:migrate        jalankan supabase/migrations/*.sql
 *   npm run db:seed           jalankan supabase/seed.sql (data contoh)
 *   npm run db:admin          bikin user admin (ADMIN_EMAIL / ADMIN_PASSWORD) + masukkan ke admin_users
 *   npm run db:setup          migrate + seed + admin sekaligus
 *
 * Env (di .env.local):
 *   SUPABASE_DB_URL             Settings → Database → Connection string (URI, pakai Session pooler / direct)
 *   SUPABASE_SERVICE_ROLE_KEY   Settings → API → service_role (hanya untuk db:admin, JANGAN di-commit)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   ADMIN_EMAIL, ADMIN_PASSWORD
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const cmd = process.argv[2];
const root = resolve(import.meta.dirname, "..");
const need = (k) => {
  const v = process.env[k];
  if (!v) {
    console.error(`✗ Env ${k} belum diisi di .env.local`);
    process.exit(1);
  }
  return v;
};

async function withDb(fn) {
  const client = new pg.Client({
    connectionString: need("SUPABASE_DB_URL"),
    ssl: /localhost|127\.0\.0\.1/.test(process.env.SUPABASE_DB_URL) ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function migrate() {
  const dir = resolve(root, "supabase/migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  await withDb(async (db) => {
    for (const f of files) {
      process.stdout.write(`→ ${f} … `);
      await db.query(readFileSync(resolve(dir, f), "utf8"));
      console.log("ok");
    }
  });
}

async function seed() {
  await withDb(async (db) => {
    const { rows } = await db.query("select count(*)::int as n from public.players");
    if (rows[0].n > 0 && !process.argv.includes("--force")) {
      console.log(`↷ seed dilewati: tabel players sudah ada ${rows[0].n} baris (pakai --force untuk tetap jalan)`);
      return;
    }
    process.stdout.write("→ seed.sql … ");
    await db.query(readFileSync(resolve(root, "supabase/seed.sql"), "utf8"));
    console.log("ok");
  });
}

async function admin() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = need("NEXT_PUBLIC_SUPABASE_URL");
  const key = need("SUPABASE_SERVICE_ROLE_KEY");
  const email = need("ADMIN_EMAIL");
  const password = need("ADMIN_PASSWORD");
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  process.stdout.write(`→ user ${email} … `);
  let userId;
  const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    if (!/already|exists|registered/i.test(error.message)) throw error;
    // sudah ada → cari id-nya
    const { data: list, error: e2 } = await sb.auth.admin.listUsers({ perPage: 1000 });
    if (e2) throw e2;
    userId = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
    if (!userId) throw new Error("user ada tapi tidak ketemu di listUsers");
    console.log("sudah ada");
  } else {
    userId = data.user.id;
    console.log("dibuat");
  }

  process.stdout.write("→ admin_users … ");
  const { error: e3 } = await sb.from("admin_users").upsert({ user_id: userId }, { onConflict: "user_id" });
  if (e3) throw e3;
  console.log("ok");
  console.log(`\n✓ Login di /admin/login pakai ${email}`);
}

const run = { migrate, seed, admin, setup: async () => { await migrate(); await seed(); await admin(); } }[cmd];
if (!run) {
  console.error("usage: node scripts/db.mjs <migrate|seed|admin|setup> [--force]");
  process.exit(1);
}
run().catch((e) => {
  console.error("✗", e.message ?? e);
  process.exit(1);
});
