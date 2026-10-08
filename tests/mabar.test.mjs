// Run: npm test  (node --test with TypeScript type stripping)
import { test } from "node:test";
import assert from "node:assert/strict";
import { americanoSchedule, americanoCoverage, teamRoundRobin, mabarStandings } from "../src/lib/mabarRules.ts";
import { generateRound } from "../src/lib/generator.ts";

const pairKey = (a, b) => [a, b].sort().join("|");
const partners = (rounds) => rounds.flatMap((r) => r.courts.flatMap((c) => [pairKey(...c.a), pairKey(...c.b)]));

test("americano: 4 pemain 1 court, tiap pemain berpasangan dengan semua pemain lain tepat sekali", () => {
  const s = americanoSchedule(["P1", "P2", "P3", "P4"], 1);
  assert.equal(s.length, 3);
  const p = partners(s);
  assert.equal(p.length, 6);
  assert.equal(new Set(p).size, 6);
  assert.ok(s.every((r) => r.resting.length === 0 && r.courts.length === 1));
});

test("americano: 8 pemain 2 court, partner tidak pernah berulang, tanpa konflik per ronde", () => {
  // Correctness (no dropped/duplicate partnership, no player on two courts at once) is guaranteed.
  // The round count isn't necessarily the theoretical minimum (7) — the opponent-minimizing matcher
  // can require a few extra rounds to avoid pairing two partnerships that share a player — but it
  // never drops a partnership to get there.
  const players = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const s = americanoSchedule(players, 2, 3);
  const p = partners(s);
  assert.equal(p.length, 28);
  assert.equal(new Set(p).size, 28);
  for (const r of s) {
    const inRound = r.courts.flatMap((c) => [...c.a, ...c.b]);
    assert.equal(new Set(inRound).size, inRound.length, "nggak ada pemain main 2 court sekaligus");
  }
});

test("americano: court terbatas (1 court, 8 pemain) tetap nggak ada yang main dobel per ronde", () => {
  const s = americanoSchedule(["1", "2", "3", "4", "5", "6", "7", "8"], 1, 4);
  assert.ok(s.every((r) => r.courts.length === 1 && r.resting.length === 4));
  const p = partners(s);
  assert.equal(new Set(p).size, 28, "semua 28 partnership tetap kejadwalin, cuma butuh lebih banyak ronde");
});

test("team americano: 3 tim 1 court, semua bertemu sekali dan bye bergiliran (contoh task)", () => {
  const s = teamRoundRobin(["A", "B", "C"], 1);
  const games = s.flatMap((r) => r.courts.map((c) => pairKey(c.a, c.b)));
  assert.deepEqual([...games].sort(), ["A|B", "A|C", "B|C"]);
  assert.deepEqual(s.map((r) => r.resting.length), [1, 1, 1]);
  assert.equal(new Set(s.flatMap((r) => r.resting)).size, 3);
});

test("team americano: 9 tim 2 court, semua 36 pertemuan kejadwalin tanpa konflik ronde", () => {
  const teams = Array.from({ length: 9 }, (_, i) => `T${i + 1}`);
  const s = teamRoundRobin(teams, 2, 7);
  const games = s.flatMap((r) => r.courts.map((c) => pairKey(c.a, c.b)));
  assert.equal(games.length, 36, "9 tim = 36 pertemuan unik");
  assert.equal(new Set(games).size, 36, "tidak ada pertemuan yang berulang");
  for (const r of s) {
    const involved = r.courts.flatMap((c) => [c.a, c.b]);
    assert.equal(new Set(involved).size, involved.length, "satu tim tidak main di 2 court sekaligus");
  }
  // every team plays every other exactly once
  for (const t of teams) {
    const opponents = games.filter((g) => g.includes(t)).length;
    assert.equal(opponents, 8, `${t} harus main 8 kali (lawan semua tim lain)`);
  }
});

test("team americano: 9 tim 2 court, rehat merata (nggak ada yang main/rehat numpuk)", () => {
  const teams = Array.from({ length: 9 }, (_, i) => `T${i + 1}`);
  const s = teamRoundRobin(teams, 2, 7);
  for (const t of teams) {
    let streak = 0;
    let maxPlayStreak = 0;
    let maxRestStreak = 0;
    let restRun = 0;
    for (const r of s) {
      const playing = r.courts.some((c) => c.a === t || c.b === t);
      if (playing) {
        streak++;
        restRun = 0;
      } else {
        restRun++;
        streak = 0;
      }
      maxPlayStreak = Math.max(maxPlayStreak, streak);
      maxRestStreak = Math.max(maxRestStreak, restRun);
    }
    assert.ok(maxPlayStreak <= 2, `${t} main ${maxPlayStreak}x beruntun, kebanyakan`);
    assert.ok(maxRestStreak <= 2, `${t} rehat ${maxRestStreak}x beruntun, kebanyakan`);
  }
});

test("klasemen americano: contoh task (P1 12, P4 10, P2 8, P3 6)", () => {
  const t = mabarStandings(["P1", "P2", "P3", "P4"], [
    { a: ["P1", "P2"], b: ["P3", "P4"], ga: 4, gb: 2 },
    { a: ["P1", "P3"], b: ["P2", "P4"], ga: 3, gb: 3 },
    { a: ["P1", "P4"], b: ["P2", "P3"], ga: 5, gb: 1 },
  ]);
  assert.deepEqual(t.map((r) => [r.key, r.games]), [["P1", 12], ["P4", 10], ["P2", 8], ["P3", 6]]);
  assert.deepEqual(t.map((r) => r.rank), [1, 2, 3, 4]);
});

test("klasemen: wins menentukan urutan duluan, baru poin — 2 win poin dikit ungguli 1 win poin banyak", () => {
  const t = mabarStandings(["A", "B"], [
    { a: ["A"], b: ["Z"], ga: 1, gb: 0 }, // A: win #1, 1 poin
    { a: ["A"], b: ["Z"], ga: 1, gb: 0 }, // A: win #2, total 2 win, 2 poin
    { a: ["B"], b: ["Z"], ga: 20, gb: 0 }, // B: 1 win, tapi 20 poin
  ]);
  assert.deepEqual(t.map((r) => [r.key, r.wins, r.games]), [["A", 2, 2], ["B", 1, 20]]);
});

test("klasemen fixed partner: contoh task (A 9, B 5, C 4), seri boleh", () => {
  const t = mabarStandings(["A", "B", "C"], [
    { a: ["A"], b: ["B"], ga: 4, gb: 2 },
    { a: ["A"], b: ["C"], ga: 5, gb: 1 },
    { a: ["B"], b: ["C"], ga: 3, gb: 3 },
  ]);
  assert.deepEqual(t.map((r) => [r.key, r.games, r.draws]), [["A", 9, 0], ["B", 5, 1], ["C", 4, 1]]);
});

test("klasemen: total game sama, jumlah menang menentukan", () => {
  const t = mabarStandings(["X", "Y"], [
    { a: ["X"], b: ["Z"], ga: 6, gb: 0 },
    { a: ["Y"], b: ["Z"], ga: 3, gb: 2 },
    { a: ["Y"], b: ["Z"], ga: 3, gb: 4 },
  ]);
  assert.deepEqual(t.map((r) => r.key), ["X", "Y"]);
});

test("klasemen: 2 pemain seri penuh, head-to-head menentukan", () => {
  const t = mabarStandings(["X", "Y"], [
    { a: ["X"], b: ["Y"], ga: 4, gb: 3 },
    { a: ["Y"], b: ["X"], ga: 4, gb: 3 },
    { a: ["X"], b: ["Q"], ga: 2, gb: 3 },
    { a: ["Y"], b: ["Q"], ga: 2, gb: 3 },
  ]);
  // totals 9 vs 9, wins 1 vs 1, diff 0 vs 0 → head-to-head: X 4+3=7 vs Y 3+4=7 → still level → lottery, but stable
  const again = mabarStandings(["Y", "X"], [
    { a: ["X"], b: ["Y"], ga: 4, gb: 3 },
    { a: ["Y"], b: ["X"], ga: 4, gb: 3 },
    { a: ["X"], b: ["Q"], ga: 2, gb: 3 },
    { a: ["Y"], b: ["Q"], ga: 2, gb: 3 },
  ]);
  assert.deepEqual(t.map((r) => r.key), again.map((r) => r.key), "undian stabil");

  const h = mabarStandings(["X", "Y"], [
    { a: ["X"], b: ["Y"], ga: 5, gb: 3 },
    { a: ["X"], b: ["Q"], ga: 1, gb: 4 },
    { a: ["Y"], b: ["Q"], ga: 3, gb: 2 },
  ]);
  // X 6 games 1W, Y 6 games 1W, diff X 5-3+1-4=-1, Y 3-5+3-2=-1 → head-to-head X won 5–3
  assert.deepEqual(h.map((r) => r.key), ["X", "Y"]);
});

test("klasemen: wins sama, jumlah main tidak sama → rata-rata game per match", () => {
  const t = mabarStandings(["A", "B"], [
    { a: ["A"], b: ["Z"], ga: 4, gb: 0 },
    { a: ["A"], b: ["Z"], ga: 0, gb: 4 },
    { a: ["B"], b: ["Z"], ga: 5, gb: 0 },
  ]);
  assert.deepEqual(t.map((r) => [r.key, r.wins, r.avg]), [["B", 1, 5], ["A", 1, 2]]);
});

test("americano coverage: 8 pemain 2 court = 7 ronde (28 partnership, 14 match, 2 court)", () => {
  assert.deepEqual(americanoCoverage(8, 2, false), { cycle: 7, total: 28 });
});

test("americano coverage: 8 pemain 1 court = 14 ronde (14 match, 1 court, nggak ada yang kelewat)", () => {
  assert.deepEqual(americanoCoverage(8, 1, false), { cycle: 14, total: 28 });
});

test("team americano coverage: 3 tim 1 court (contoh task) = 3 ronde", () => {
  assert.deepEqual(americanoCoverage(3, 1, true), { cycle: 3, total: 3 });
});

test("team americano coverage: 9 tim 2 court = 18 ronde (36 pertemuan / 2 court)", () => {
  assert.deepEqual(americanoCoverage(9, 2, true), { cycle: 18, total: 36 });
});

// ---- Mexicano pairing (generateRound): ranking from the table, 1+4 vs 2+3, top 4 on court 1
const pool = (ranked) => ranked.map((id, i) => ({ id, team_no: null, total_points: ranked.length - i, sits_out_count: 0 }));

test("mexicano: contoh task R2 (P1 4, P2 4, P3 2, P4 2 → urutan P1,P2,P3,P4) = P1+P4 vs P2+P3", () => {
  const { pairings } = generateRound("mexicano", pool(["P1", "P2", "P3", "P4"]), 1, new Map());
  assert.deepEqual(pairings, [{ team_a: ["P1", "P4"], team_b: ["P2", "P3"] }]);
});

test("mexicano: contoh task R3 (P1 9, P4 7, P2 5, P3 3) = P1+P3 vs P4+P2", () => {
  const { pairings } = generateRound("mexicano", pool(["P1", "P4", "P2", "P3"]), 1, new Map());
  assert.deepEqual(pairings, [{ team_a: ["P1", "P3"], team_b: ["P4", "P2"] }]);
});

test("mexicano: 8 pemain 2 court, 4 teratas di court 1", () => {
  const { pairings } = generateRound("mexicano", pool(["1", "2", "3", "4", "5", "6", "7", "8"]), 2, new Map());
  assert.deepEqual(pairings, [
    { team_a: ["1", "4"], team_b: ["2", "3"] },
    { team_a: ["5", "8"], team_b: ["6", "7"] },
  ]);
});

test("fixed mexicano: peringkat 1 vs 2, 3 vs 4", () => {
  const teams = [["A1", "A2"], ["B1", "B2"], ["C1", "C2"], ["D1", "D2"]];
  const p = teams.flatMap((t, i) => t.map((id) => ({ id, team_no: i + 1, total_points: 4 - i, sits_out_count: 0 })));
  const { pairings } = generateRound("fixed_mexicano", p, 2, new Map());
  assert.deepEqual(pairings, [
    { team_a: ["A1", "A2"], team_b: ["B1", "B2"] },
    { team_a: ["C1", "C2"], team_b: ["D1", "D2"] },
  ]);
});
