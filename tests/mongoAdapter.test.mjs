import test from "node:test";
import assert from "node:assert/strict";
import { levelColorFor, applyCollectionDefaults, handleCascadeDelete } from "../src/lib/server/mongo/triggers.ts";
import { MongoQueryBuilder } from "../src/lib/server/mongo/queryBuilder.ts";
import { stageEntries } from "../src/lib/server/mongo/utils.ts";

test("levelColorFor: maps every skill level to its official badge hex color", () => {
  assert.equal(levelColorFor("Rookie"), "#FBF7F1");
  assert.equal(levelColorFor("Beginner"), "#FFD43B");
  assert.equal(levelColorFor("Low Bronze"), "#2563EB");
  assert.equal(levelColorFor("Bronze"), "#EF4444");
  assert.equal(levelColorFor("Silver"), "#17151F");
  assert.equal(levelColorFor(null), "#FFD43B");
});

test("applyCollectionDefaults: sets Postgres defaults on players, matches, events", () => {
  const p = applyCollectionDefaults("players", { name: "Test Player", level: "Bronze" });
  assert.equal(p.points, 0);
  assert.equal(p.wins, 0);
  assert.equal(p.losses, 0);
  assert.equal(p.points_adjustment, 0);
  assert.equal(p.active, true);
  assert.equal(p.level, "Bronze");
  assert.equal(p.level_color, "#EF4444");
  assert.equal(p.level_overridden, false);

  const m = applyCollectionDefaults("matches", { team_a: "A", team_b: "B" });
  assert.equal(m.team_a_game, "0");
  assert.equal(m.team_b_game, "0");
  assert.equal(m.games_a, 0);
  assert.equal(m.games_b, 0);
  assert.equal(m.is_live, false);
  assert.equal(m.timer_running, false);
  assert.equal(m.is_wo, false);
  assert.equal(m.team_a_games, 0);
  assert.equal(m.team_b_games, 0);
  assert.equal(m.is_bye, false);
  assert.equal(m.status, "scheduled");
});

test("MongoQueryBuilder: chains update/delete with multiple eq, neq, is, in, not, match", () => {
  const q1 = new MongoQueryBuilder("matches")
    .update({ is_live: false, timer_running: false })
    .eq("court_id", "court-1")
    .eq("is_live", true)
    .neq("id", "match-1")
    .is("winner", null);
  assert.equal(q1 instanceof MongoQueryBuilder, true);

  const q2 = new MongoQueryBuilder("events")
    .delete()
    .eq("slug", "test-slug")
    .neq("id", "ev-1")
    .not("status", "eq", "finished")
    .match({ type: "kompetisi" });
  assert.equal(q2 instanceof MongoQueryBuilder, true);
});

test("MongoQueryBuilder: sortInMemory respects nullsFirst: false on ascending order", () => {
  const qb = new MongoQueryBuilder("matches").order("scheduled_order", {
    ascending: true,
    nullsFirst: false,
  });
  const sorted = qb.sortInMemory([
    { id: "m1", scheduled_order: null },
    { id: "m2", scheduled_order: 2 },
    { id: "m3", scheduled_order: 1 },
  ]);
  assert.deepEqual(
    sorted.map((m) => m.id),
    ["m3", "m2", "m1"]
  );
});

// Minimal in-memory Db: supports {f: v}, {f: {$in: [...]}} and {$or: [...]} filters.
function fakeDb(seed) {
  const data = structuredClone(seed);
  const matches = (doc, filter) =>
    Object.entries(filter).every(([k, cond]) => {
      if (k === "$or") return cond.some((f) => matches(doc, f));
      if (cond && typeof cond === "object" && "$in" in cond) return cond.$in.includes(doc[k]);
      return doc[k] === cond;
    });
  return {
    data,
    collection(name) {
      data[name] ??= [];
      return {
        find: (f) => ({ toArray: async () => data[name].filter((d) => matches(d, f)) }),
        findOne: async (f) => data[name].find((d) => matches(d, f)) ?? null,
        deleteMany: async (f) => {
          data[name] = data[name].filter((d) => !matches(d, f));
        },
        updateMany: async (f, u) => {
          for (const d of data[name]) if (matches(d, f)) Object.assign(d, u.$set);
        },
        updateOne: async (f, u) => {
          const d = data[name].find((x) => matches(x, f));
          if (d) Object.assign(d, u.$set);
        },
      };
    },
  };
}

const LEAGUE_SEED = {
  leagues: [{ _id: "L1", id: "L1", name: "East Padel League", total_volumes: 3 }],
  league_volumes: [
    { _id: "V1", id: "V1", league_id: "L1", volume_number: 1, event_id: "E1" },
    { _id: "V2", id: "V2", league_id: "L1", volume_number: 2, event_id: "E2" },
    { _id: "V3", id: "V3", league_id: "L1", volume_number: 3, event_id: null },
  ],
  events: [
    { _id: "E1", id: "E1", league_id: "L1", league_volume_id: "V1" },
    { _id: "E2", id: "E2", league_id: "L1", league_volume_id: "V2" },
  ],
};

test("handleCascadeDelete: deleting a volume's event keeps the slot and nulls event_id (ON DELETE SET NULL)", async () => {
  const db = fakeDb(LEAGUE_SEED);
  const e2 = db.data.events.find((e) => e.id === "E2");
  db.data.events = db.data.events.filter((e) => e.id !== "E2");
  await handleCascadeDelete(db, "events", [e2]);

  assert.deepEqual(
    db.data.league_volumes.map((v) => [v.volume_number, v.event_id]),
    [[1, "E1"], [2, null], [3, null]]
  );
});

test("handleCascadeDelete: deleting a league removes its volumes and unlinks its events", async () => {
  const db = fakeDb(LEAGUE_SEED);
  const league = db.data.leagues[0];
  db.data.leagues = [];
  await handleCascadeDelete(db, "leagues", [league]);

  assert.equal(db.data.league_volumes.length, 0);
  assert.deepEqual(
    db.data.events.map((e) => [e.id, e.league_id, e.league_volume_id]),
    [["E1", null, null], ["E2", null, null]]
  );
});

test("stageEntries: reads comp_finish_event p_stages as sent by finishCompetition ([{ team_id, stage }])", () => {
  assert.deepEqual(
    stageEntries([
      { team_id: "T1", stage: "champion" },
      { team_id: "T2", stage: "runner_up" },
    ]),
    [["T1", "champion"], ["T2", "runner_up"]]
  );
  assert.deepEqual(stageEntries({ T1: "champion" }), [["T1", "champion"]]);
  assert.deepEqual(stageEntries(null), []);
});

test("applyCollectionDefaults: leagues and league_volumes get Postgres defaults", () => {
  const l = applyCollectionDefaults("leagues", { name: "Liga", slug: "liga-x" });
  assert.equal(l.organizer, "");
  assert.equal(l.total_volumes, 3);
  assert.equal(l.published, true);
  assert.equal(l.points.champion, 25);
  assert.equal(l.status, undefined);

  const v = applyCollectionDefaults("league_volumes", { league_id: "L1", volume_number: 1 });
  assert.equal(v.is_final, false);
  assert.equal(v.event_id, null);
  assert.equal(v.approx_date, "");
test("applyCollectionDefaults: gen_participants start active and checked in (Postgres 0007 defaults)", () => {
  const p = applyCollectionDefaults("gen_participants", { event_id: "G1", player_id: "P1", display_name: "Dimas" });
  assert.equal(p.active, true);
  assert.equal(p.checked_in, true);
  assert.equal(p.total_points, 0);
  assert.equal(p.sits_out_count, 0);

  const sub = applyCollectionDefaults("gen_participants", { event_id: "G1", active: false, checked_in: false });
  assert.equal(sub.active, false);
  assert.equal(sub.checked_in, false);
});
