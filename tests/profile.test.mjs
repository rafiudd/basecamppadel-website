// Run: npm test  (node --test with TypeScript type stripping)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  eventHistory,
  filterReports,
  reportFilterOptions,
  reportSummaries,
  splitNotes,
  sessionAverages,
  skillBoards,
  strongestAndWeakest,
} from "../src/lib/coachingRules.ts";

const skills = [
  { key: "forehand", kind: "teknik", group_label: "Groundstroke", label: "Forehand", sort: 10 },
  { key: "backhand", kind: "teknik", group_label: "Groundstroke", label: "Backhand", sort: 11 },
  { key: "volley_fh", kind: "teknik", group_label: "Di net", label: "Volley FH", sort: 30 },
  { key: "positioning", kind: "ingame", group_label: "Taktik", label: "Positioning", sort: 110 },
];

const report = (id, date, coach, ratings) => ({
  id,
  session: { id: `s-${id}`, title: "Mabar with Coach", session_date: date, venue: "Padel Hubz", coach_name: coach },
  evaluation: [],
  next_practice: [],
  ratings: Object.entries(ratings).map(([skill_key, score]) => ({ skill_key, score })),
});

// given out of order on purpose
const reports = [
  report("r3", "2026-10-05", "Lukman", { forehand: 4, backhand: 3, volley_fh: 3.5 }),
  report("r1", "2026-09-12", "Lukman", { forehand: 3 }),
  report("r2", "2026-09-21", "Reyhan", { forehand: 3.5, backhand: 3.5, positioning: 2.5 }),
];

test("skillBoards: latest score, delta vs the previous rating, unrated stay null", () => {
  const [teknik, ingame] = skillBoards(skills, reports);
  assert.equal(teknik.rated, 3);
  assert.equal(teknik.total, 3);
  assert.deepEqual(teknik.groups.map((g) => g.label), ["Groundstroke", "Di net"]);
  const [fh, bh] = teknik.groups[0].items;
  assert.deepEqual([fh.score, fh.delta], [4, 0.5]);
  assert.deepEqual([bh.score, bh.delta], [3, -0.5]); // went down: no ▲
  assert.deepEqual([teknik.groups[1].items[0].score, teknik.groups[1].items[0].delta], [3.5, null]); // rated once
  assert.equal(ingame.rated, 1);
  assert.equal(skillBoards(skills, [])[0].groups[0].items[0].score, null);
});

test("sessionAverages: oldest first, one decimal", () => {
  assert.deepEqual(
    sessionAverages(reports).map((s) => [s.reportId, s.avg]),
    [["r1", 3], ["r2", 3.2], ["r3", 3.5]],
  );
});

test("reportSummaries: average and skills that rose since their previous rating", () => {
  const sum = reportSummaries(skills, reports);
  assert.deepEqual(sum.get("r1"), { average: 3, rising: [] });
  assert.deepEqual(sum.get("r2").rising, [{ label: "Forehand", delta: 0.5 }]);
  assert.deepEqual(sum.get("r3"), { average: 3.5, rising: [{ label: "Forehand", delta: 0.5 }] }); // backhand went down
});

test("splitNotes: one point per line, bullets stripped", () => {
  assert.deepEqual(splitNotes("- Forehand stabil.\n- Backwall BH telat.\n"), ["Forehand stabil.", "Backwall BH telat."]);
  assert.deepEqual(splitNotes("Servis sudah konsisten."), ["Servis sudah konsisten."]);
  assert.deepEqual(splitNotes("\u2022 a\r\n\n2) b"), ["a", "b"]);
  assert.deepEqual(splitNotes(null), []);
});

test("strongestAndWeakest", () => {
  const { best, weakest } = strongestAndWeakest(skillBoards(skills, reports));
  assert.equal(best.key, "forehand");
  assert.equal(weakest.key, "positioning");
  assert.deepEqual(strongestAndWeakest(skillBoards(skills, [])), { best: null, weakest: null });
});

test("filterReports: newest first, by coach and year", () => {
  assert.deepEqual(filterReports(reports, {}).map((r) => r.id), ["r3", "r2", "r1"]);
  assert.deepEqual(filterReports(reports, { coach: "Lukman" }).map((r) => r.id), ["r3", "r1"]);
  assert.deepEqual(filterReports(reports, { year: "2025" }).map((r) => r.id), []);
  assert.deepEqual(reportFilterOptions(reports), { coaches: ["Lukman", "Reyhan"], years: ["2026"] });
});

test("eventHistory: groups matches + award per event, own side from the opponent name", () => {
  const match = (event_id, a, b, ga, gb) => ({ event_id, team_a_name: a, team_b_name: b, team_a_games: ga, team_b_games: gb });
  const history = [
    { id: "h1", created_at: "2026-09-28T10:00:00Z", result: "W", opponent_label: "Dinda / Kirana", session_label: "Battle", points_delta: 0, match: match("e1", "Nadia / Salsa", "Dinda / Kirana", 6, 3) },
    { id: "h2", created_at: "2026-09-28T11:00:00Z", result: "L", opponent_label: "Tasya / Bella", session_label: "Battle", points_delta: 0, match: match("e1", "Tasya / Bella", "Nadia / Salsa", 6, 3) },
    { id: "h3", created_at: "2026-08-01T10:00:00Z", result: "W", opponent_label: "Tim B", session_label: "Sesi lama", points_delta: 10, match: null },
  ];
  const awards = [
    { event_id: "e1", stage: "group", rank: null, points: 15 },
    { event_id: "e2", stage: "mabar", rank: 2, points: 20 },
  ];
  const events = [
    { id: "e1", title: "Basecamp Battle #01", type: "kompetisi", event_date: "2026-09-28" },
    { id: "e2", title: "Mabar Minggu", type: "mabar", event_date: "2026-09-14" },
  ];
  const list = eventHistory(history, awards, events);
  assert.deepEqual(list.map((e) => e.title), ["Basecamp Battle #01", "Mabar Minggu", "Sesi lama"]);
  const battle = list[0];
  assert.deepEqual([battle.wins, battle.losses, battle.points], [1, 1, 15]);
  assert.deepEqual(battle.matches.map((m) => [m.team, m.score, m.result]), [
    ["Nadia / Salsa", "6–3", "W"],
    ["Nadia / Salsa", "3–6", "L"],
  ]);
  assert.deepEqual(list[1].award, { stage: "mabar", rank: 2 });
  assert.equal(list[2].points, 10);
  assert.equal(list[2].matches[0].score, null);
});

test("rapor labels match the hand-made rapor (3.5 Bagus, avg 2.8 Lumayan, avg 3.8 Hampir bagus)", async () => {
  const { scoreLabel, averageLabel } = await import("../src/lib/coachingRules.ts");
  assert.deepEqual([1, 2, 3, 3.5, 4, 4.5, 5].map(scoreLabel), ["Belum bisa", "Mulai bisa", "Lumayan", "Bagus", "Bagus", "Mantap", "Mantap"]);
  assert.equal(averageLabel(2.8), "Lumayan");
  assert.equal(averageLabel(3.8), "Hampir bagus");
  assert.equal(averageLabel(4.2), "Bagus");
});

test("reportHighlights: ties all shown, nothing to train when every score is equal", async () => {
  const { reportHighlights } = await import("../src/lib/coachingRules.ts");
  const r = (label, score) => ({ label, score });
  const { best, weakest } = reportHighlights([r("Volley", 3.5), r("Defense", 2), r("Lob", 3), r("Bajada", 2)]);
  assert.deepEqual(best.map((x) => x.label), ["Volley"]);
  assert.deepEqual(weakest.map((x) => x.label), ["Defense", "Bajada"]);
  assert.deepEqual(reportHighlights([r("A", 3), r("B", 3)]).weakest, []);
});

test("raporFileName: BASECAMP_CLINIC_<NAME>_<D>_<MON>", async () => {
  const { raporFileName } = await import("../src/lib/coachingRules.ts");
  assert.equal(raporFileName("Fita", "2026-10-05"), "BASECAMP_CLINIC_FITA_5_OKT");
  assert.equal(raporFileName("Nadia Putri", "2026-09-21"), "BASECAMP_CLINIC_NADIA_PUTRI_21_SEP");
  assert.equal(raporFileName("Zoë-Ann", "2026-01-02"), "BASECAMP_CLINIC_ZOE_ANN_2_JAN");
});

test("raporHtml: escapes text, half segment, title is the file name", async () => {
  const { raporHtml } = await import("../src/lib/raporTemplate.ts");
  const html = raporHtml({
    fileName: "BASECAMP_CLINIC_FITA_5_OKT",
    name: "<b>Fita</b>",
    date: "2026-10-05",
    coaches: ["Lukman"],
    average: 3.8,
    averageLabel: "Hampir bagus",
    best: ["Forehand"],
    weakest: [],
    ratings: [{ label: "Volley", score: 3.5, scoreLabel: "Bagus" }],
    evaluation: ["a & b"],
    nextPractice: [],
  });
  assert.match(html, /<title>BASECAMP_CLINIC_FITA_5_OKT<\/title>/);
  assert.match(html, /&lt;b&gt;Fita&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<b>Fita/);
  assert.match(html, /5 OKTOBER 2026/);
  assert.match(html, /<i class="sg on"><\/i><i class="sg on"><\/i><i class="sg on"><\/i><i class="sg hf"><\/i><i class="sg"><\/i>/);
  assert.match(html, /a &amp; b/);
  assert.doesNotMatch(html, /Perlu dilatih/);
});

test("COACHING_SKILLS (default list): 23 teknik + 16 in-game, unique keys", async () => {
  const { COACHING_SKILLS } = await import("../src/lib/coachingSkills.ts");
  assert.equal(COACHING_SKILLS.filter((s) => s.kind === "teknik").length, 23);
  assert.equal(COACHING_SKILLS.filter((s) => s.kind === "ingame").length, 16);
  assert.equal(new Set(COACHING_SKILLS.map((s) => s.key)).size, 39);
});
