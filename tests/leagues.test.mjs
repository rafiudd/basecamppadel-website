import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LEAGUE_POINTS,
  computeLeagueStandings,
  determineLiveStage,
  formatStageLabel,
} from "../src/lib/leagueRules.ts";
import { formatDateShortIndo } from "../src/lib/format.ts";

test("DEFAULT_LEAGUE_POINTS matches East League rules (25/20/15/5/1)", () => {
  assert.equal(DEFAULT_LEAGUE_POINTS.champion, 25);
  assert.equal(DEFAULT_LEAGUE_POINTS.runner_up, 20);
  assert.equal(DEFAULT_LEAGUE_POINTS.sf, 15);
  assert.equal(DEFAULT_LEAGUE_POINTS.qf, 5);
  assert.equal(DEFAULT_LEAGUE_POINTS.group, 1);
});

test("formatDateShortIndo: formats YYYY-MM-DD into short Indonesian format", () => {
  assert.equal(formatDateShortIndo("2026-10-24"), "Sab, 24 Okt");
  assert.equal(formatDateShortIndo("2026-11-01"), "Min, 1 Nov");
  assert.equal(formatDateShortIndo(""), "");
});

test("computeLeagueStandings: correctly aggregates points and calculates ranking with ties", () => {
  const results = [
    // Volume 1
    { playerId: "p_nadia", playerName: "Nadia Putri", volumeNumber: 1, stage: "champion", isProvisional: false }, // 25
    { playerId: "p_salsa", playerName: "Salsa Amalia", volumeNumber: 1, stage: "champion", isProvisional: false }, // 25
    { playerId: "p_rara", playerName: "Rara Kusuma", volumeNumber: 1, stage: "runner_up", isProvisional: false }, // 20
    { playerId: "p_dinda", playerName: "Dinda Ayu", volumeNumber: 1, stage: "runner_up", isProvisional: false }, // 20
    { playerId: "p_bima", playerName: "Bima Sakti", volumeNumber: 1, stage: "sf", isProvisional: false }, // 15
    // Volume 2 (Nadia plays with Tiara, Rara plays with Dinda)
    { playerId: "p_nadia", playerName: "Nadia Putri", volumeNumber: 2, stage: "sf", isProvisional: false }, // 15
    { playerId: "p_tiara", playerName: "Tiara Lestari", volumeNumber: 2, stage: "sf", isProvisional: false }, // 15
    { playerId: "p_rara", playerName: "Rara Kusuma", volumeNumber: 2, stage: "champion", isProvisional: false }, // 25
    { playerId: "p_dinda", playerName: "Dinda Ayu", volumeNumber: 2, stage: "champion", isProvisional: false }, // 25
  ];

  const standings = computeLeagueStandings(results, DEFAULT_LEAGUE_POINTS);

  // Rara: V1=20, V2=25 -> Total=45
  // Dinda: V1=20, V2=25 -> Total=45
  // Nadia: V1=25, V2=15 -> Total=40
  // Salsa: V1=25, V2=- -> Total=25
  // Bima: V1=15, V2=- -> Total=15
  // Tiara: V1=-, V2=15 -> Total=15

  assert.equal(standings.length, 6);

  // Tied rank 1: Dinda & Rara (45 pts each)
  assert.equal(standings[0].rank, 1);
  assert.equal(standings[0].totalPoints, 45);
  assert.equal(standings[1].rank, 1);
  assert.equal(standings[1].totalPoints, 45);

  // Rank 3: Nadia (40 pts)
  assert.equal(standings[2].rank, 3);
  assert.equal(standings[2].playerName, "Nadia Putri");
  assert.equal(standings[2].totalPoints, 40);
  assert.equal(standings[2].volumeScores[1].points, 25);
  assert.equal(standings[2].volumeScores[2].points, 15);

  // Rank 4: Salsa (25 pts)
  assert.equal(standings[3].rank, 4);
  assert.equal(standings[3].playerName, "Salsa Amalia");
  assert.equal(standings[3].totalPoints, 25);

  // Tied rank 5: Bima & Tiara (15 pts each)
  assert.equal(standings[4].rank, 5);
  assert.equal(standings[4].totalPoints, 15);
  assert.equal(standings[5].rank, 5);
  assert.equal(standings[5].totalPoints, 15);
});

test("determineLiveStage: detects live match first", () => {
  const matches = [
    { stage: "group", status: "finished" },
    { stage: "qf", status: "finished" },
    { stage: "sf", status: "live", is_live: true },
    { stage: "final", status: "scheduled" },
  ];
  assert.equal(determineLiveStage(matches), "sf");
  assert.equal(formatStageLabel("sf"), "Semifinal");
});

test("determineLiveStage: falls back to earliest uncompleted stage if none live", () => {
  const matches = [
    { stage: "group", status: "finished" },
    { stage: "qf", status: "scheduled" },
    { stage: "sf", status: "scheduled" },
  ];
  assert.equal(determineLiveStage(matches), "qf");
  assert.equal(formatStageLabel("qf"), "Perempat final");
});

test("determineLiveStage: defaults to sf when no matches provided", () => {
  assert.equal(determineLiveStage([]), "sf");
  assert.equal(formatStageLabel(determineLiveStage([])), "Semifinal");
});

test("formatStageLabel: maps all stages correctly to Indonesian UI names", () => {
  assert.equal(formatStageLabel("group"), "Fase grup");
  assert.equal(formatStageLabel("r16"), "Babak 16 besar");
  assert.equal(formatStageLabel("qf"), "Perempat final");
  assert.equal(formatStageLabel("sf"), "Semifinal");
  assert.equal(formatStageLabel("final"), "Final");
});

test("liga lifecycle: full flow from Vol 1 finished through Vol 2 provisional to cumulative ranking", () => {
  // Vol 1 (Completed): Nadia & Salsa are Champions (25 pts), Dinda & Rina are Runners-up (20 pts)
  const vol1Results = [
    { playerId: "p_nadia", playerName: "Nadia Putri", volumeNumber: 1, stage: "champion", isProvisional: false },
    { playerId: "p_salsa", playerName: "Salsa Amalia", volumeNumber: 1, stage: "champion", isProvisional: false },
    { playerId: "p_dinda", playerName: "Dinda Rahma", volumeNumber: 1, stage: "runner_up", isProvisional: false },
    { playerId: "p_rina", playerName: "Rina", volumeNumber: 1, stage: "runner_up", isProvisional: false },
  ];

  // Vol 2 (Live / In-Progress in Semifinal):
  // Nadia pairs with Jamaludin -> reaches SF (15* provisional pts)
  // Salsa pairs with Dinda -> reaches SF (15* provisional pts)
  const vol2Results = [
    { playerId: "p_nadia", playerName: "Nadia Putri", volumeNumber: 2, stage: "sf", isProvisional: true },
    { playerId: "p_jamal", playerName: "Jamaludin", volumeNumber: 2, stage: "sf", isProvisional: true },
    { playerId: "p_salsa", playerName: "Salsa Amalia", volumeNumber: 2, stage: "sf", isProvisional: true },
    { playerId: "p_dinda", playerName: "Dinda Rahma", volumeNumber: 2, stage: "sf", isProvisional: true },
  ];

  const standings = computeLeagueStandings([...vol1Results, ...vol2Results], DEFAULT_LEAGUE_POINTS);

  // Assertions:
  // Nadia: 25 + 15 = 40 (Rank 1, hasProvisional: true)
  // Salsa: 25 + 15 = 40 (Rank 1, hasProvisional: true)
  // Dinda: 20 + 15 = 35 (Rank 3, hasProvisional: true)
  // Rina: 20 (Rank 4, hasProvisional: false)
  // Jamal: 15 (Rank 5, hasProvisional: true)

  const nadia = standings.find((r) => r.playerId === "p_nadia");
  const salsa = standings.find((r) => r.playerId === "p_salsa");
  const dinda = standings.find((r) => r.playerId === "p_dinda");
  const rina = standings.find((r) => r.playerId === "p_rina");
  const jamal = standings.find((r) => r.playerId === "p_jamal");

  assert.equal(nadia.rank, 1);
  assert.equal(nadia.totalPoints, 40);
  assert.equal(nadia.hasProvisional, true);
  assert.equal(nadia.volumeScores[1].points, 25);
  assert.equal(nadia.volumeScores[2].points, 15);
  assert.equal(nadia.volumeScores[2].isProvisional, true);

  assert.equal(salsa.rank, 1);
  assert.equal(salsa.totalPoints, 40);
  assert.equal(salsa.hasProvisional, true);

  assert.equal(dinda.rank, 3);
  assert.equal(dinda.totalPoints, 35);
  assert.equal(dinda.hasProvisional, true);

  assert.equal(rina.rank, 4);
  assert.equal(rina.totalPoints, 20);
  assert.equal(rina.hasProvisional, false);

  assert.equal(jamal.rank, 5);
  assert.equal(jamal.totalPoints, 15);
  assert.equal(jamal.hasProvisional, true);
});


