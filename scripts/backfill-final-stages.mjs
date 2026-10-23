#!/usr/bin/env node
/**
 * Backfill final_stage + player_awards for finished kompetisi events.
 *
 * Events finished while the Mongo `comp_finish_event` RPC read `p_stages` wrongly got status
 * "finished" but no comp_teams.final_stage and no player_awards, so league standings counted
 * everyone as "group" and players missed their event points. This recomputes the stages from
 * the KO results (same `computeFinalStages` the finish button uses) and writes what is missing.
 *
 *   node --env-file=.env --experimental-strip-types --no-warnings scripts/backfill-final-stages.mjs                 # DEV, dry run
 *   node --env-file=.env --experimental-strip-types --no-warnings scripts/backfill-final-stages.mjs --apply         # DEV, write
 *   node --env-file=.env --experimental-strip-types --no-warnings scripts/backfill-final-stages.mjs --target=prod --confirm-prod --apply
 *
 * Idempotent: teams that already have a final_stage and players that already have an award are left alone.
 */
import crypto from "node:crypto";
import { MongoClient } from "mongodb";
import { computeFinalStages } from "../src/lib/competition.ts";
import { recomputePlayerStats } from "../src/lib/server/mongo/triggers.ts";

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

console.log(`📌 Target : ${target.toUpperCase()} [${dbName}]`);
console.log(`📌 Mode   : ${apply ? "APPLY (menulis data)" : "DRY RUN (tidak menulis)"}\n`);

const KO_STAGES = ["r16", "qf", "sf", "final"];
const idOf = (d) => String(d.id || d._id);

const client = new MongoClient(uri);
await client.connect();
try {
  const db = client.db(dbName);
  const events = await db.collection("events").find({ type: "kompetisi", status: "finished" }).toArray();
  console.log(`Event kompetisi selesai: ${events.length}`);

  const affectedPlayers = new Set();
  let fixedEvents = 0;

  for (const ev of events) {
    const eventId = idOf(ev);
    const label = `${ev.title} (${eventId})`;
    const teams = await db.collection("comp_teams").find({ event_id: eventId }).toArray();
    const links = await db.collection("comp_team_players").find({ event_id: eventId }).toArray();
    const awards = await db.collection("player_awards").find({ event_id: eventId }).toArray();

    const awarded = new Set(awards.map((a) => a.player_id));
    const teamsMissingStage = teams.filter((t) => !t.final_stage);
    const linksMissingAward = links.filter((l) => l.player_id && !awarded.has(l.player_id));
    if (!teamsMissingStage.length && !linksMissingAward.length) continue;

    const matches = await db
      .collection("matches")
      .find({ event_id: eventId, stage: { $in: KO_STAGES } })
      .toArray();
    const stages = computeFinalStages(
      teams.map(idOf),
      matches.map((m) => ({
        stage: m.stage,
        a: m.team_a_id ?? null,
        b: m.team_b_id ?? null,
        winner: m.winner_team_id ?? null,
        bye: !!m.is_bye,
        finished: m.status === "finished",
      })),
    );
    if (!stages) {
      console.log(`⚠ ${label}: final belum selesai / tidak ada pemenang final — dilewati, cek manual.`);
      continue;
    }

    fixedEvents++;
    console.log(`\n▶ ${label}`);
    const now = new Date();

    for (const t of teams) {
      const stage = t.final_stage || stages[idOf(t)];
      if (!t.final_stage) {
        console.log(`   tim ${t.name ?? idOf(t)} → final_stage = ${stage}`);
        if (apply) await db.collection("comp_teams").updateOne({ _id: t._id }, { $set: { final_stage: stage, updated_at: now } });
      }

      for (const l of links.filter((x) => x.team_id === idOf(t) && x.player_id && !awarded.has(x.player_id))) {
        const points = Number(ev.points?.[stage] ?? 0);
        console.log(`   award pemain ${l.player_id} → ${stage} (${points} poin)`);
        affectedPlayers.add(l.player_id);
        awarded.add(l.player_id);
        if (apply) {
          const aid = crypto.randomUUID();
          await db.collection("player_awards").insertOne({
            _id: aid,
            id: aid,
            event_id: eventId,
            player_id: l.player_id,
            team_id: idOf(t),
            stage,
            points,
            created_at: now,
            updated_at: now,
          });
        }
      }
    }
  }

  if (apply && affectedPlayers.size) await recomputePlayerStats(db, [...affectedPlayers]);

  console.log(
    `\n${apply ? "✓ Selesai" : "ℹ Dry run selesai"}: ${fixedEvents} event, ${affectedPlayers.size} pemain ${apply ? "diperbaiki" : "akan diperbaiki"}.`,
  );
  if (!apply && fixedEvents) console.log("  Jalankan ulang dengan --apply untuk menulis.");
} finally {
  await client.close();
}
