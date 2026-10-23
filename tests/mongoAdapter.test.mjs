import test from "node:test";
import assert from "node:assert/strict";
import { levelColorFor, applyCollectionDefaults } from "../src/lib/server/mongo/triggers.ts";
import { MongoQueryBuilder } from "../src/lib/server/mongo/queryBuilder.ts";

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
