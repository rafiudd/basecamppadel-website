// Run: npm test  (node --test with TypeScript type stripping)
import { test } from "node:test";
import assert from "node:assert/strict";
import { findStartConflict, findTeamClash } from "../src/lib/matchRules.ts";

const match = (id, over = {}) => ({
  id,
  team_a_id: null,
  team_b_id: null,
  team_a_name: `${id}-A`,
  team_b_name: `${id}-B`,
  team_a_player_ids: [],
  team_b_player_ids: [],
  status: "scheduled",
  court_id: null,
  ...over,
});

test("findTeamClash: a kompetisi team already playing", () => {
  const m = match("m1", { team_a_id: "t1", team_b_id: "t2" });
  const busy = match("m2", { team_a_id: "t3", team_b_id: "t2", status: "live" });
  const clash = findTeamClash(m, [busy]);
  assert.equal(clash?.side, "B");
  assert.equal(clash?.with.id, "m2");
});

test("findTeamClash: a mabar player already playing", () => {
  const m = match("m1", { team_a_player_ids: ["p1", "p2"], team_b_player_ids: ["p3", "p4"] });
  const busy = match("m2", { team_a_player_ids: ["p5", "p1"], team_b_player_ids: ["p6", "p7"] });
  assert.equal(findTeamClash(m, [busy])?.side, "A");
});

test("findTeamClash: no shared team or player, and the match itself is ignored", () => {
  const m = match("m1", { team_a_id: "t1", team_b_id: "t2", team_a_player_ids: ["p1"] });
  assert.equal(findTeamClash(m, [m, match("m2", { team_a_id: "t3", team_b_id: "t4", team_a_player_ids: ["p9"] })]), null);
});

test("findStartConflict: court still busy", () => {
  const busy = match("m2", { status: "live", court_id: "c1" });
  const res = findStartConflict(match("m1", { court_id: "c1" }), [busy], 3);
  assert.deepEqual(res, { kind: "court", with: busy });
});

test("findStartConflict: as many running matches as courts", () => {
  const running = [match("a", { status: "live", court_id: "c1" }), match("b", { status: "live", court_id: "c2" })];
  assert.deepEqual(findStartConflict(match("m1", { court_id: "c3" }), running, 2), { kind: "capacity", running: 2, courts: 2 });
});

test("findStartConflict: free court and capacity left, finished matches don't count", () => {
  const list = [match("a", { status: "live", court_id: "c1" }), match("b", { status: "finished", court_id: "c2" })];
  assert.equal(findStartConflict(match("m1", { court_id: "c2" }), list, 2), null);
});

test("findStartConflict: an event without courts counts as one court", () => {
  assert.equal(findStartConflict(match("m1"), [match("a", { status: "live" })], 0)?.kind, "capacity");
});
