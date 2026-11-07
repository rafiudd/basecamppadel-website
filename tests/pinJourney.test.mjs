// Run: npm test  (node --test with TypeScript type stripping)
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateMissions, closestMission, nextPinLevel, PIN_MISSIONS } from "../src/lib/pinJourney.ts";

test("evaluateMissions: skill mission done when score meets the bar", () => {
  const [status] = evaluateMissions([{ skill: "Forehand", minScore: 3.5 }], { Forehand: 4 }, 0);
  assert.equal(status.done, true);
  assert.equal(status.gapLabel, null);
  assert.equal(status.detail, "4 / ≥ 3.5");
});

test("evaluateMissions: skill mission not done reports the gap", () => {
  const [status] = evaluateMissions([{ skill: "Double glass", minScore: 2.5 }], { "Double glass": 2 }, 0);
  assert.equal(status.done, false);
  assert.equal(status.gapLabel, "kurang 0.5");
});

test("evaluateMissions: unrated skill is 'belum dinilai', not a false gap", () => {
  const [status] = evaluateMissions([{ skill: "Block", minScore: 3 }], {}, 0);
  assert.equal(status.done, false);
  assert.equal(status.progress, 0);
  assert.equal(status.gapLabel, "belum dinilai");
});

test("evaluateMissions: sessions mission counts submitted coaching sessions", () => {
  const [status] = evaluateMissions([{ sessions: 3 }], {}, 2);
  assert.equal(status.done, false);
  assert.equal(status.detail, "2 / 3 sesi");
  assert.equal(status.gapLabel, "1 sesi lagi");
});

test("evaluateMissions: sessions mission clamps progress/detail at the target, not past it", () => {
  const [status] = evaluateMissions([{ sessions: 3 }], {}, 5);
  assert.equal(status.done, true);
  assert.equal(status.progress, 1);
  assert.equal(status.detail, "3 / 3 sesi");
});

test("closestMission: picks the unmet mission with the most progress, ignoring unrated/session gaps first", () => {
  const statuses = evaluateMissions(
    [
      { skill: "Forehand", minScore: 3.5 }, // done
      { skill: "Backwall FH", minScore: 3 }, // close: 2.5/3
      { skill: "Double glass", minScore: 2.5 }, // unrated
      { sessions: 3 },
    ],
    { Forehand: 4, "Backwall FH": 2.5 },
    1,
  );
  const tip = closestMission(statuses);
  assert.equal(tip?.label, "Backwall FH");
});

test("closestMission: null once every mission is cleared", () => {
  const statuses = evaluateMissions([{ skill: "Forehand", minScore: 2 }], { Forehand: 3 }, 0);
  assert.equal(closestMission(statuses), null);
});

test("nextPinLevel: steps through the ladder and stops at the top", () => {
  assert.equal(nextPinLevel("Rookie"), "Beginner");
  assert.equal(nextPinLevel("Bronze"), "Silver");
  assert.equal(nextPinLevel("Silver"), null);
});

test("PIN_MISSIONS: every level up to Bronze has at least one skill mission and a sessions mission", () => {
  for (const level of ["Rookie", "Beginner", "Low Bronze", "Bronze"]) {
    const missions = PIN_MISSIONS[level];
    assert.ok(missions.some((m) => "sessions" in m), `${level} is missing a sessions mission`);
    assert.ok(missions.some((m) => "skill" in m), `${level} is missing a skill mission`);
  }
  assert.deepEqual(PIN_MISSIONS.Silver, []);
});
