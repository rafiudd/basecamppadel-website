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
    eventLabel: "MABAR WITH COACH",
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
  assert.match(html, /RAPOR MABAR WITH COACH/);
  assert.doesNotMatch(html, /class="two"/);
});

test("raporHtml: notes-only session has no score cards; many skills go two columns", async () => {
  const { raporHtml, TWO_COLUMN_FROM } = await import("../src/lib/raporTemplate.ts");
  const base = { fileName: "F", eventLabel: "CLINIC", name: "Fita", date: "2026-10-05", coaches: [], averageLabel: "", best: [], weakest: [], evaluation: ["ok"], nextPractice: [] };
  const notesOnly = raporHtml({ ...base, average: null, ratings: [] });
  assert.doesNotMatch(notesOnly, /Nilai rata-rata|Nilai per teknik/);
  assert.match(notesOnly, /Evaluasi/);
  const ratings = Array.from({ length: TWO_COLUMN_FROM }, (_, i) => ({ label: `S${i}`, score: 3, scoreLabel: "Lumayan" }));
  assert.match(raporHtml({ ...base, average: 3, averageLabel: "Lumayan", ratings }), /class="two"/);
  assert.doesNotMatch(raporHtml({ ...base, average: 3, averageLabel: "Lumayan", ratings: ratings.slice(1) }), /class="two"/);
});

test("previousReport: first rapor has nothing to compare, later ones the last rated session", async () => {
  const { previousReport } = await import("../src/lib/coachingRules.ts");
  const rep = (id, date, ratings) => ({ id, session: { id, title: "", session_date: date, venue: "", coach_name: "" }, evaluation: [], next_practice: [], ratings });
  const reports = [rep("c", "2026-10-12", [{ skill_key: "lob", score: 3 }]), rep("a", "2026-09-01", [{ skill_key: "lob", score: 2 }]), rep("b", "2026-09-20", [])];
  assert.deepEqual({ ...previousReport(reports, "a"), previous: previousReport(reports, "a").previous?.id }, { session: 1, previous: undefined, previousSession: 0 });
  const third = previousReport(reports, "c");
  assert.equal(third.session, 3);
  assert.equal(third.previous?.id, "a"); // "b" has no scores
  assert.equal(third.previousSession, 1);
});

test("raporCompare: none for a first rapor, else badge, rounded deltas and the two notes", async () => {
  const { raporCompare } = await import("../src/lib/coachingRules.ts");
  const rated = [{ label: "Lob", score: 3, prev: 2.5 }, { label: "Volley FH", score: 2.8, prev: 3.1 }, { label: "Bajada", score: 3, prev: null }];
  assert.equal(raporCompare(rated, { session: 1, previous: null, previousSession: 0 }), null);
  const c = raporCompare(rated, { session: 3, previous: { id: "x" }, previousSession: 2 });
  assert.equal(c.session, 3);
  assert.deepEqual(c.chart.map((x) => x.delta), [0.5, -0.3, null]);
  assert.equal(c.summary, "1 naik · 1 turun");
  assert.deepEqual(c.notes.map((n) => n.lead), ["Paling kuat:", "Progres:"]);
  assert.match(c.notes[0].text, /^Lob, Bajada \(3\)\./);
});

test("progressSummary / chartChanges: counts, the Progres note, biggest changes first", async () => {
  const { progressSummary, chartChanges } = await import("../src/lib/coachingRules.ts");
  const mixed = progressSummary([{ label: "Lob", delta: 0.5 }, { label: "Volley FH", delta: -1 }, { label: "Bajada", delta: null }, { label: "Servis", delta: 0 }], 1);
  assert.equal(mixed.summary, "1 naik · 1 tetap · 1 turun");
  assert.equal(mixed.note, "naik dari sesi 1 di Lob. Yang turun (Volley FH) jadi fokus latihan berikutnya.");
  assert.equal(progressSummary([{ label: "A", delta: -0.5 }, { label: "B", delta: -1 }], 2).note, "A, B turun dari sesi 2, jadi ini fokus latihan berikutnya.");
  assert.deepEqual(progressSummary([{ label: "A", delta: null }], 1), { summary: "", note: "" });
  const five = ["A", "B", "C", "D", "E"].map((label) => ({ label, delta: 1 }));
  assert.equal(progressSummary(five, 1).note, "naik dari sesi 1 di A, B, C dan 2 lainnya. Pertahankan!");
  const many = Array.from({ length: 12 }, (_, i) => ({ label: `S${i}`, delta: i === 3 ? -2 : i === 7 ? 1 : i < 6 ? 0 : null }));
  const shown = chartChanges(many);
  assert.equal(shown.length, 10);
  assert.deepEqual(shown.map((c) => c.label).slice(0, 4), ["S0", "S1", "S2", "S3"]); // skill order kept
  assert.ok(shown.some((c) => c.label === "S7"));
});

test("raporHtml: comparison only when given; markers, previous column, SESI badge, bold notes", async () => {
  const { raporHtml } = await import("../src/lib/raporTemplate.ts");
  const base = { fileName: "F", eventLabel: "CLINIC", name: "Fita", date: "2026-10-12", coaches: [], average: 2.5, averageLabel: "Lumayan", best: ["Lob"], weakest: ["Volley"], evaluation: [], nextPractice: [] };
  const first = raporHtml({ ...base, ratings: [{ label: "Lob", score: 3, scoreLabel: "Lumayan" }, { label: "Volley", score: 2, scoreLabel: "Mulai bisa" }] });
  assert.match(first, /Paling bagus/);
  assert.doesNotMatch(first, /Progres vs|class="pm"|SESI \d/);
  const second = raporHtml({
    ...base,
    ratings: [{ label: "Lob", score: 3, scoreLabel: "Lumayan", prev: 2 }, { label: "Volley", score: 2, scoreLabel: "Mulai bisa", prev: null }],
    compare: { session: 2, previousSession: 1, summary: "1 naik", chart: [{ label: "Lob", delta: 1 }, { label: "Volley", delta: null }], notes: [{ lead: "Progres:", text: "naik dari sesi 1 di Lob." }] },
  });
  assert.match(second, /Progres vs sesi 1/);
  assert.doesNotMatch(second, /Paling bagus/);
  assert.match(second, />SESI 2</);
  assert.match(second, /class="pm" style="left:40%"/);
  assert.match(second, /<span class="bp">2<\/span>/);
  assert.match(second, /<span class="bp">–<\/span>/);
  assert.match(second, />\+1</);
  assert.match(second, />BARU</);
  assert.match(second, /<li><b>Progres:<\/b> naik dari sesi 1 di Lob.<\/li>/);
});

test("raporHtml: player photo with glow in the header, badges move under the logo; only http(s) photos", async () => {
  const { raporHtml } = await import("../src/lib/raporTemplate.ts");
  const base = { fileName: "F", eventLabel: "CLINIC", name: "Fita", date: "2026-10-12", coaches: [], average: null, averageLabel: "", best: [], weakest: [], ratings: [], evaluation: ["ok"], nextPractice: [] };
  const withPhoto = raporHtml({ ...base, photoUrl: 'https://img.example/a.png?x="1"' });
  assert.match(withPhoto, /<img class="pp" src="https:\/\/img\.example\/a\.png\?x=&quot;1&quot;"/);
  assert.match(withPhoto, /<i class="gl"><\/i>/);
  assert.match(withPhoto, /class="top ph"/);
  assert.match(withPhoto, /<div class="bd">/);
  for (const photoUrl of [null, "javascript:alert(1)", "data:image/png;base64,AA"]) {
    const html = raporHtml({ ...base, photoUrl });
    assert.doesNotMatch(html, /class="pp"|class="gl"|class="bd"/);
  }
});

test("raporEventLabel / raporCoaches: title without its date, grader then group coach", async () => {
  const { raporEventLabel, raporCoaches } = await import("../src/lib/coachingRules.ts");
  assert.equal(raporEventLabel("Coaching Clinic · Basecamp Battle #01"), "COACHING CLINIC · BASECAMP BATTLE #01");
  assert.equal(raporEventLabel("Mabar with Coach · Sen, 5 Okt 2026"), "MABAR WITH COACH");
  assert.equal(raporEventLabel("  "), "MABAR WITH COACH");
  const s = { id: "s", title: "", session_date: "2026-10-05", venue: "", coach_name: "Lukman" };
  assert.deepEqual(raporCoaches({ ...s, group_coach_name: "Dani" }), ["Lukman", "Dani"]);
  assert.deepEqual(raporCoaches({ ...s, group_coach_name: "Lukman" }), ["Lukman"]);
  assert.deepEqual(raporCoaches({ ...s, coach_name: "", group_coach_name: "Dani" }), ["Dani"]);
});

test("COACHING_SKILLS (default list): 23 teknik + 16 in-game, unique keys", async () => {
  const { COACHING_SKILLS } = await import("../src/lib/coachingSkills.ts");
  assert.equal(COACHING_SKILLS.filter((s) => s.kind === "teknik").length, 23);
  assert.equal(COACHING_SKILLS.filter((s) => s.kind === "ingame").length, 16);
  assert.equal(new Set(COACHING_SKILLS.map((s) => s.key)).size, 39);
});

test("partnerOf: teammate from the team name, whole team when the player isn't in it", async () => {
  const { partnerOf } = await import("../src/lib/coachingRules.ts");
  assert.equal(partnerOf("Nadia / Salsa", "Nadia Putri"), "Salsa");
  assert.equal(partnerOf("Salsa / nadia", "Nadia"), "Salsa");
  assert.equal(partnerOf("Dinda / Kirana", "Nadia"), "Dinda / Kirana");
});

test("eventHistory: coaching sessions become entries, same-title sessions stay separate; matchHistory labels", async () => {
  const { eventHistory, matchHistory } = await import("../src/lib/coachingRules.ts");
  const coach = (id, title, date, event_id = null) => ({ id, session: { id: `s-${id}`, title, session_date: date, venue: "", coach_name: "", event_id } });
  const history = [
    { id: "h1", created_at: "2026-09-28T10:00:00Z", result: "W", opponent_label: "Dinda / Kirana", session_label: "Battle", points_delta: 0,
      match: { event_id: "e1", team_a_name: "Nadia / Salsa", team_b_name: "Dinda / Kirana", team_a_games: 6, team_b_games: 3, section: "Grup B" } },
  ];
  const events = [{ id: "e1", title: "Basecamp Battle #01", type: "kompetisi", event_date: "2026-09-28" }];
  const list = eventHistory(history, [], events, {
    ownName: "Nadia Putri",
    coaching: [coach("r1", "Mabar with Coach", "2026-09-21"), coach("r2", "Mabar with Coach", "2026-10-05"), coach("r3", "Battle clinic", "2026-09-28", "e1")],
  });
  assert.deepEqual(list.map((e) => [e.title, e.kind, e.reportId]), [
    ["Mabar with Coach", "coaching", "r2"],
    ["Basecamp Battle #01", "coaching", "r3"], // a session inside an event marks that event
    ["Mabar with Coach", "coaching", "r1"],
  ]);
  const [m] = matchHistory(list);
  assert.deepEqual([m.label, m.partner, m.score], ["Basecamp Battle #01 · Grup B", "Salsa", "6–3"]);
});

test("eventHistory: an award whose event can't be read still has a title and the award's date", async () => {
  const { eventHistory } = await import("../src/lib/coachingRules.ts");
  const [e] = eventHistory([], [{ event_id: "e9", stage: "mabar", rank: 2, points: 20, created_at: "2026-10-13T17:00:00Z" }], []);
  assert.deepEqual([e.title, e.date, e.points], ["Event", "2026-10-13", 20]);
  const { formatDayMonthYear } = await import("../src/lib/format.ts");
  assert.equal(formatDayMonthYear(""), "");
  assert.equal(formatDayMonthYear("2026-10-05"), "5 Okt 2026");
});

test("skillBoards: a skill added later to an existing category joins that category (Master Teknik appends)", async () => {
  const { skillBoards } = await import("../src/lib/coachingRules.ts");
  const sk = (key, group_label, sort, kind = "teknik") => ({ key, kind, group_label, label: key, sort });
  const [teknik] = skillBoards(
    [sk("forehand", "Groundstroke", 1), sk("volley", "Di net", 2), sk("lob", "Groundstroke", 40), sk("new-cat", "Baru", 41)],
    [],
  );
  assert.deepEqual(teknik.groups.map((g) => [g.label, g.items.map((i) => i.key)]), [
    ["Groundstroke", ["forehand", "lob"]],
    ["Di net", ["volley"]],
    ["Baru", ["new-cat"]],
  ]);
  assert.equal(teknik.total, 4);
});
