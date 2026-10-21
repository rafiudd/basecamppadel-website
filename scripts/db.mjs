#!/usr/bin/env node
/**
 * Basecamp Padel — MongoDB CLI
 *
 *   npm run db:migrate        buat/optimasi semua index & unique constraints di MongoDB
 *   npm run db:seed           cek status koleksi di MongoDB
 *   npm run db:admin          buat/update akun admin di MongoDB (ADMIN_EMAIL / ADMIN_PASSWORD)
 *   npm run db:setup          indexes + admin + status sekaligus
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { MongoClient } from "mongodb";

const cmd = process.argv[2] || "status";
const root = resolve(import.meta.dirname, "..");

function runScript(relPath, extraArgs = []) {
  const res = spawnSync(process.execPath, [resolve(root, relPath), ...extraArgs], {
    stdio: "inherit",
    env: process.env,
  });
  if (res.status !== 0) {
    process.exit(res.status || 1);
  }
}

async function status() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("✗ Env MONGODB_URI belum diisi di .env");
    process.exit(1);
  }
  const dbName = process.env.MONGODB_DB_NAME || process.env.MONGODB_DB_DEV || "DEV";
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    console.log(`📊 MongoDB Database [${dbName}] (${collections.length} koleksi):`);
    for (const c of collections.sort((a, b) => a.name.localeCompare(b.name))) {
      const count = await db.collection(c.name).countDocuments();
      console.log(`  - ${c.name.padEnd(28)}: ${count} dokumen`);
    }
  } finally {
    await client.close();
  }
}

async function indexes() {
  runScript("scripts/optimize-mongo-indexes.mjs", process.argv.slice(3));
}

async function admin() {
  runScript("scripts/create-mongo-admin.mjs", process.argv.slice(3));
}

const handlers = {
  indexes,
  migrate: indexes,
  status,
  seed: status,
  admin,
  setup: async () => {
    await indexes();
    await admin();
    await status();
  },
};

const fn = handlers[cmd];
if (!fn) {
  console.error("usage: node scripts/db.mjs <indexes|status|admin|setup>");
  process.exit(1);
}
fn().catch((e) => {
  console.error("✗", e.message ?? e);
  process.exit(1);
});
