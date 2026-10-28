import test from "node:test";
import assert from "node:assert/strict";
import { recomputePlayerStats } from "../src/lib/server/mongo/triggers.ts";

const LEADERBOARD_COLLATION = { locale: "en", strength: 2 };

function rankByGender(players) {
  const rank = (list) =>
    list
      .slice()
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.name.localeCompare(b.name))
      .map((p, i) => ({ ...p, rank: i + 1 }));
  return {
    men: rank(players.filter((p) => p.gender === "M")),
    women: rank(players.filter((p) => p.gender === "F")),
  };
}

test("recomputePlayerStats: calculates wins, losses, points and applies bulkWrite", async () => {
  const playersData = [
    { _id: "p1", id: "player-1", name: "Player One", points_adjustment: 5 },
    { _id: "p2", id: "player-2", name: "Player Two", points_adjustment: -20 },
  ];

  let capturedBulkOps = [];

  const mockDb = {
    collection(name) {
      if (name === "players") {
        return {
          find: () => ({
            toArray: async () => playersData,
          }),
          bulkWrite: async (ops) => {
            capturedBulkOps = ops;
            return { ok: 1 };
          },
        };
      }
      if (name === "match_history") {
        return {
          aggregate: () => ({
            toArray: async () => [
              { _id: "player-1", wins: 2, losses: 1, matchPoints: 15 },
              { _id: "player-2", wins: 0, losses: 1, matchPoints: 2 },
            ],
          }),
        };
      }
      if (name === "player_awards") {
        return {
          aggregate: () => ({
            toArray: async () => [
              { _id: "player-1", awardPoints: 25 },
              { _id: "player-2", awardPoints: 10 },
            ],
          }),
        };
      }
      throw new Error(`Unknown collection: ${name}`);
    },
  };

  await recomputePlayerStats(mockDb, ["player-1", "player-2"]);

  assert.equal(capturedBulkOps.length, 2);

  const p1Op = capturedBulkOps.find((op) => op.updateOne.filter._id === "p1");
  assert.equal(p1Op.updateOne.update.$set.wins, 2);
  assert.equal(p1Op.updateOne.update.$set.losses, 1);
  // matchPoints (15) + awards (25) + adjustment (5) = 45
  assert.equal(p1Op.updateOne.update.$set.points, 45);

  const p2Op = capturedBulkOps.find((op) => op.updateOne.filter._id === "p2");
  assert.equal(p2Op.updateOne.update.$set.wins, 0);
  assert.equal(p2Op.updateOne.update.$set.losses, 1);
  // matchPoints (2) + awards (10) + adjustment (-20) = -8 -> clamped to 0
  assert.equal(p2Op.updateOne.update.$set.points, 0);
});

test("rankByGender: sorts players by points descending and case-insensitively by name", () => {
  const players = [
    { id: "1", name: "budi", gender: "M", points: 50 },
    { id: "2", name: "Andra", gender: "M", points: 50 },
    { id: "3", name: "Charlie", gender: "M", points: 100 },
    { id: "4", name: "Zaskia", gender: "F", points: 80 },
    { id: "5", name: "anna", gender: "F", points: 80 },
  ];

  const ranked = rankByGender(players);

  // Men: Charlie (100) -> Andra (50) -> budi (50)
  assert.equal(ranked.men[0].name, "Charlie");
  assert.equal(ranked.men[0].rank, 1);
  assert.equal(ranked.men[1].name, "Andra");
  assert.equal(ranked.men[1].rank, 2);
  assert.equal(ranked.men[2].name, "budi");
  assert.equal(ranked.men[2].rank, 3);

  // Women: anna (80) -> Zaskia (80)
  assert.equal(ranked.women[0].name, "anna");
  assert.equal(ranked.women[0].rank, 1);
  assert.equal(ranked.women[1].name, "Zaskia");
  assert.equal(ranked.women[1].rank, 2);
});

test("LEADERBOARD_COLLATION: configured to locale en with case-insensitive strength 2", () => {
  assert.equal(LEADERBOARD_COLLATION.locale, "en");
  assert.equal(LEADERBOARD_COLLATION.strength, 2);
});
