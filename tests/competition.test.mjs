// Run: npm test  (node --test with TypeScript type stripping)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  planFormat,
  roundRobin,
  splitIntoGroups,
  computeStandings,
  buildFirstRound,
  planBracket,
  computeFinalStages,
  assignSlots,
  findConflicts,
  groupFixtures,
} from "../src/lib/competition.ts";

const m = (a, b, ga, gb, wo = false) => ({ a, b, ga, gb, wo, finished: true, winner: wo ? (ga >= gb ? a : b) : ga > gb ? a : b });

test("planFormat: contoh task 6 tim, 2 grup, top 2", () => {
  const p = planFormat({ teams: 6, groups: 2, advance: 2 });
  assert.deepEqual(p.errors, []);
  assert.equal(p.flow.join(" → "), "2 grup × 3 tim → top 2 → Semifinal → Final");
  assert.equal(p.groupMatches, 6);
  assert.equal(p.byes, 0);
  assert.equal(p.koStart, "sf");
});

test("planFormat: validasi minimal 3 tim per grup", () => {
  assert.ok(planFormat({ teams: 11, groups: 4, advance: 1 }).errors.some((e) => e.includes("minimal 3 tim")));
  assert.ok(planFormat({ teams: 9, groups: 3, advance: 3 }).errors.length > 0);
});

test("planFormat: bye otomatis kalau slot bukan pangkat 2", () => {
  const p = planFormat({ teams: 9, groups: 3, advance: 2 });
  assert.deepEqual(p.errors, []);
  assert.equal(p.qualifiers, 6);
  assert.equal(p.slots, 8);
  assert.equal(p.byes, 2);
  assert.equal(p.koStart, "qf");
  assert.equal(p.koMatches, 5);
  assert.equal(p.flow[0], "3 grup × 3 tim");
});

test("planFormat: grup tidak rata selisih maksimal 1", () => {
  const p = planFormat({ teams: 11, groups: 3, advance: 2 });
  assert.deepEqual(p.sizes, [4, 4, 3]);
  assert.equal(p.flow[0], "2 grup × 4 tim + 1 grup × 3 tim");
});

test("roundRobin: n(n-1)/2 match tanpa duplikat", () => {
  for (const n of [3, 4, 5, 6]) {
    const ids = Array.from({ length: n }, (_, i) => `t${i}`);
    const pairs = roundRobin(ids).flat();
    assert.equal(pairs.length, (n * (n - 1)) / 2);
    const keys = new Set(pairs.map(([a, b]) => [a, b].sort().join("|")));
    assert.equal(keys.size, pairs.length);
  }
});

test("splitIntoGroups: dibagi rata", () => {
  const groups = splitIntoGroups(Array.from({ length: 11 }, (_, i) => i), 4);
  assert.deepEqual(groups.map((g) => g.length), [3, 3, 3, 2]);
  assert.equal(new Set(groups.flat()).size, 11);
});

test("klasemen: contoh task grup A dan B", () => {
  const a = computeStandings(["T1", "T2", "T3"], [m("T1", "T2", 6, 3), m("T1", "T3", 6, 4), m("T2", "T3", 7, 6)]);
  assert.deepEqual(a.map((r) => [r.teamId, r.wins, r.gw, r.gl, r.diff]), [
    ["T1", 2, 12, 7, 5],
    ["T2", 1, 10, 12, -2],
    ["T3", 0, 10, 13, -3],
  ]);
  const b = computeStandings(["T4", "T5", "T6"], [m("T4", "T5", 4, 6), m("T4", "T6", 6, 2), m("T5", "T6", 6, 4)]);
  assert.deepEqual(b.map((r) => [r.teamId, r.wins, r.gw, r.gl, r.diff]), [
    ["T5", 2, 12, 8, 4],
    ["T4", 1, 10, 8, 2],
    ["T6", 0, 6, 12, -6],
  ]);
});

test("tiebreak 2 tim seri: head-to-head mengalahkan selisih game", () => {
  const rows = computeStandings(
    ["X", "Y", "Z", "W"],
    [m("X", "Z", 6, 0), m("X", "W", 6, 0), m("Y", "X", 6, 5), m("Y", "Z", 6, 5), m("W", "Y", 6, 5), m("Z", "W", 6, 5)],
  );
  assert.deepEqual(rows.map((r) => r.teamId), ["Y", "X", "Z", "W"]);
});

test("tiebreak 3 tim seri: tanpa head-to-head, pakai selisih game", () => {
  const rows = computeStandings(["A", "B", "C"], [m("A", "B", 6, 4), m("B", "C", 6, 1), m("C", "A", 6, 5)]);
  assert.deepEqual(rows.map((r) => r.teamId), ["B", "A", "C"]);
});

test("tiebreak 3 tim seri: selisih sama, pakai jumlah game menang, lalu undian stabil", () => {
  const ms = [m("A", "B", 7, 5), m("B", "C", 6, 4), m("C", "A", 6, 4)];
  const rows = computeStandings(["A", "B", "C"], ms, 42);
  assert.equal(rows[2].teamId, "C");
  assert.deepEqual(computeStandings(["A", "B", "C"], ms, 42).map((r) => r.teamId), rows.map((r) => r.teamId));
});

test("WO: dihitung menang/kalah tanpa game", () => {
  const rows = computeStandings(["A", "B"], [m("A", "B", 0, 0, true)]);
  assert.equal(rows[0].teamId, "A");
  assert.equal(rows[0].wins, 1);
  assert.equal(rows[0].gw + rows[0].gl + rows[1].gw + rows[1].gl, 0);
});

test("bracket: seeding silang 2 grup (contoh task) sampai juara", () => {
  const ga = computeStandings(["T1", "T2", "T3"], [m("T1", "T2", 6, 3), m("T1", "T3", 6, 4), m("T2", "T3", 7, 6)]);
  const gb = computeStandings(["T4", "T5", "T6"], [m("T4", "T5", 4, 6), m("T4", "T6", 6, 2), m("T5", "T6", 6, 4)]);
  const first = buildFirstRound([{ label: "A", ranked: ga }, { label: "B", ranked: gb }], 2);
  assert.deepEqual(first, ["T1", "T4", "T5", "T2"]);
  const plan = planBracket(first);
  assert.deepEqual(plan.map((p) => [p.stage, p.a, p.b, p.next, p.nextSlot]), [
    ["sf", "T1", "T4", 2, "A"],
    ["sf", "T5", "T2", 2, "B"],
    ["final", null, null, null, null],
  ]);
  const ko = [
    { stage: "sf", a: "T1", b: "T4", winner: "T1", bye: false, finished: true },
    { stage: "sf", a: "T5", b: "T2", winner: "T5", bye: false, finished: true },
    { stage: "final", a: "T1", b: "T5", winner: "T1", bye: false, finished: true },
  ];
  assert.deepEqual(computeFinalStages(["T1", "T2", "T3", "T4", "T5", "T6"], ko), {
    T1: "champion",
    T5: "runner_up",
    T4: "sf",
    T2: "sf",
    T3: "group",
    T6: "group",
  });
});

test("bracket: seeding silang 4 grup", () => {
  const g = (label) => ({ label, ranked: [1, 2].map((i) => ({ teamId: `${label}${i}`, wins: 3 - i, diff: 0, gw: 0 })) });
  const first = buildFirstRound([g("A"), g("B"), g("C"), g("D")], 2);
  assert.deepEqual(first, ["A1", "B2", "C1", "D2", "B1", "A2", "D1", "C2"]);
});

test("bracket: bye ke juara grup dengan rekor terbaik, tanpa tim satu grup bertemu", () => {
  const row = (teamId, wins, diff) => ({ teamId, wins, diff, gw: 0 });
  const groups = [
    { label: "A", ranked: [row("A1", 2, 1), row("A2", 1, 0)] },
    { label: "B", ranked: [row("B1", 2, 10), row("B2", 1, 0)] },
    { label: "C", ranked: [row("C1", 2, 5), row("C2", 1, 0)] },
  ];
  const first = buildFirstRound(groups, 2);
  assert.equal(first.length, 8);
  const plan = planBracket(first);
  const byes = plan.filter((p) => p.bye).map((p) => p.a ?? p.b);
  assert.deepEqual(byes.sort(), ["B1", "C1"]);
  for (const p of plan.filter((x) => x.stage === "qf" && !x.bye)) assert.notEqual(p.a[0], p.b[0]);
  // bye winners already placed in the semifinal
  assert.equal(plan.filter((p) => p.stage === "sf").flatMap((p) => [p.a, p.b]).filter(Boolean).length, 2);
});

test("jadwal: tim tidak main dua kali di slot yang sama, final setelah semifinal", () => {
  const fx = groupFixtures([{ label: "A", teamIds: ["a", "b", "c"] }, { label: "B", teamIds: ["d", "e", "f"] }]);
  const slots = assignSlots(fx.map((f) => ({ teams: [f.a, f.b] })), 3);
  for (let i = 0; i < fx.length; i++)
    for (let j = i + 1; j < fx.length; j++)
      if (slots[i].slot === slots[j].slot) {
        assert.ok(![fx[i].a, fx[i].b].some((t) => [fx[j].a, fx[j].b].includes(t)));
        assert.notEqual(slots[i].court, slots[j].court);
      }
  const ko = assignSlots([{ teams: [] }, { teams: [] }, { teams: [], after: [0, 1] }], 3);
  assert.ok(ko[2].slot > ko[0].slot && ko[2].slot > ko[1].slot);
});

test("peringatan bentrok court dan tim", () => {
  const t = "2026-10-30T11:00:00.000Z";
  const c = findConflicts(
    [
      { id: "1", court_id: "c1", starts_at: t, teams: ["a", "b"] },
      { id: "2", court_id: "c1", starts_at: t, teams: ["c", "d"] },
      { id: "3", court_id: "c2", starts_at: t, teams: ["a", "e"] },
      { id: "4", court_id: "c2", starts_at: "2026-10-30T11:20:00.000Z", teams: ["a", "f"] },
    ],
    20,
  );
  assert.deepEqual(c.map((x) => `${x.a}-${x.b}:${x.kind}`), ["1-2:court", "1-3:team"]);
});
