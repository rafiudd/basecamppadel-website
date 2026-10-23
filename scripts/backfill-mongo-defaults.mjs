#!/usr/bin/env node
/**
 * Fill Postgres column defaults on rows the Mongo adapter saved before it applied them
 * (see applyCollectionDefaults in src/lib/server/mongo/triggers.ts).
 *
 * Symptoms this repairs:
 *   gen_participants without active/checked_in → every mabar player shown as "Diganti", nobody can check in
 *   matches without team_a_games/team_b_games  → mabar court card shows "undefined" as the score
 *
 * Only missing fields are set; values already stored (e.g. active: false for a substituted player) are kept.
 *
 *   node --env-file=.env scripts/backfill-mongo-defaults.mjs                                  # DEV, dry run
 *   node --env-file=.env scripts/backfill-mongo-defaults.mjs --apply                          # DEV, write
 *   node --env-file=.env scripts/backfill-mongo-defaults.mjs --target=prod --confirm-prod --apply
 */
import { MongoClient } from "mongodb";

const args = process.argv.slice(2);
const getArg = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const hasFlag = (name) => args.includes(`--${name}`);

const target = (getArg("target") || "dev").toLowerCase();
const isProd = target === "prod";
const apply = hasFlag("apply");

if (isProd && !hasFlag("confirm-prod")) {
  console.error("✗ Target PROD butuh --confirm-prod.");
  process.exit(1);
}
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("✗ Env MONGODB_URI belum diisi di .env");
  process.exit(1);
}
const dbName = isProd ? process.env.MONGODB_DB_PROD || "PROD" : process.env.MONGODB_DB_DEV || "DEV";

const DEFAULTS = {
  gen_participants: { active: true, checked_in: true, total_points: 0, sits_out_count: 0, display_name: "" },
  matches: {
    team_a_games: 0,
    team_b_games: 0,
    is_bye: false,
    is_wo: false,
    status: "scheduled",
    serve: "A",
    session_label: "",
    venue: "",
    team_a_name: "Team A",
    team_b_name: "Team B",
    team_a_player_ids: [],
    team_b_player_ids: [],
  },
};

console.log(`📌 Target : ${target.toUpperCase()} [${dbName}]`);
console.log(`📌 Mode   : ${apply ? "APPLY (menulis data)" : "DRY RUN (tidak menulis)"}`);

const client = new MongoClient(uri);
await client.connect();
try {
  const db = client.db(dbName);
  let total = 0;
  for (const [collection, fields] of Object.entries(DEFAULTS)) {
    console.log(`\n${collection}`);
    for (const [field, value] of Object.entries(fields)) {
      const filter = { [field]: { $exists: false } };
      const n = await db.collection(collection).countDocuments(filter);
      if (!n) continue;
      total += n;
      console.log(`  ${field.padEnd(18)} hilang di ${n} dokumen → ${JSON.stringify(value)}`);
      if (apply) await db.collection(collection).updateMany(filter, { $set: { [field]: value } });
    }
  }
  console.log(`\n${apply ? "✓ Selesai" : "ℹ Dry run selesai"}: ${total} field ${apply ? "diisi" : "akan diisi"}.`);
  if (!apply && total) console.log("  Jalankan ulang dengan --apply untuk menulis.");
} finally {
  await client.close();
}
