import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computePlayerLevel,
  computeScoreDelta,
  LEVEL_DEFINITIONS,
} from "../src/lib/coaching.ts";

test("Level: Rookie untuk nilai rata-rata < 2.0", () => {
  const res = computePlayerLevel({ s1: 1.5, s2: 1.0 });
  assert.equal(res.level, "Rookie");
  assert.equal(res.color, "#FBF7F1");
  assert.equal(res.cappedByMabar, false);
});

test("Level: Beginner untuk nilai rata-rata 2.0 - 2.9", () => {
  const res = computePlayerLevel({ s1: 2.0, s2: 2.5, s3: 3.0 });
  assert.equal(res.level, "Beginner");
  assert.equal(res.color, "#FFD43B");
});

test("Level: Low Bronze untuk nilai rata-rata 3.0 - 3.7", () => {
  const res = computePlayerLevel({ s1: 3.0, s2: 3.5, s3: 3.5 });
  assert.equal(res.level, "Low Bronze");
  assert.equal(res.color, "#2563EB");
});

test("Level: Bronze untuk nilai rata-rata 3.8 - 4.4 jika punya data mabar", () => {
  const res = computePlayerLevel({ s1: 4.0, s2: 4.0 }, { hasMabarData: true });
  assert.equal(res.level, "Bronze");
  assert.equal(res.color, "#EF4444");
  assert.equal(res.cappedByMabar, false);
});

test("Level: Bronze ke atas wajib punya data mabar, jika tidak dicap ke Low Bronze", () => {
  const resBronze = computePlayerLevel({ s1: 4.0, s2: 4.0 }, { hasMabarData: false });
  assert.equal(resBronze.level, "Low Bronze");
  assert.equal(resBronze.rawLevel, "Bronze");
  assert.equal(resBronze.cappedByMabar, true);

  const resSilver = computePlayerLevel({ s1: 4.5, s2: 5.0 }, { hasMabarData: false });
  assert.equal(resSilver.level, "Low Bronze");
  assert.equal(resSilver.rawLevel, "Silver");
  assert.equal(resSilver.cappedByMabar, true);
});

test("Level: Silver untuk nilai rata-rata >= 4.5 jika punya data mabar", () => {
  const res = computePlayerLevel({ s1: 4.5, s2: 5.0 }, { hasMabarData: true });
  assert.equal(res.level, "Silver");
  assert.equal(res.color, "#17151F");
  assert.equal(res.cappedByMabar, false);
});

test("Level: Override level oleh admin dengan alasan wajib diisi", () => {
  const res = computePlayerLevel(
    { s1: 2.0 },
    { overrideLevel: "Silver", overrideReason: "Eks atlet nasional tenis" }
  );
  assert.equal(res.level, "Silver");
  assert.equal(res.isOverridden, true);
  assert.equal(res.overrideReason, "Eks atlet nasional tenis");
});

test("Delta nilai: tanda ▲ dihitung dari selisih dengan nilai sesi sebelumnya", () => {
  const up = computeScoreDelta(4.0, 3.5);
  assert.equal(up.delta, 0.5);
  assert.equal(up.symbol, "▲");
  assert.equal(up.formatted, "▲ +0.5");

  const down = computeScoreDelta(3.0, 3.5);
  assert.equal(down.delta, -0.5);
  assert.equal(down.symbol, "▼");
  assert.equal(down.formatted, "▼ -0.5");

  const same = computeScoreDelta(3.5, 3.5);
  assert.equal(same.delta, 0);
  assert.equal(same.symbol, "=");

  const empty = computeScoreDelta(3.5, null);
  assert.equal(empty.delta, null);
});

import {
  generateRekapClinicExcel,
  parseRekapClinicExcel,
} from "../src/lib/coaching-excel.ts";

test("Excel: Generate dan Parse Rekap Clinic roundtrip", () => {
  const dummySkills = [
    { id: "sk-1", name: "Forehand", type: "teknik", category: "Groundstroke", sort_order: 1, active: true },
    { id: "sk-2", name: "Backhand", type: "teknik", category: "Groundstroke", sort_order: 2, active: true },
  ];
  const dummyPlayers = [
    { id: "pl-1", name: "Nadia Putri", level: "Beginner" },
    { id: "pl-2", name: "Salsa Amalia", level: "Beginner" },
  ];

  const buffer = generateRekapClinicExcel({
    sessionTitle: "Clinic Mabar 1",
    sessionDate: "2026-10-09",
    skills: dummySkills,
    rows: [
      {
        playerName: "Nadia Putri",
        groupName: "Grup 1",
        coachName: "Lukman",
        scores: { Forehand: 4.0, Backhand: 3.0 },
        evaluation: "Bagus konsisten",
        nextPractice: "Latihan defend",
      },
      {
        playerName: "Pemain Baru Tak Dikenal",
        scores: { Forehand: 2.5 },
      },
    ],
  });

  const parsed = parseRekapClinicExcel(buffer, dummySkills, dummyPlayers);
  assert.equal(parsed.success, true);
  assert.equal(parsed.previews.length, 2);

  const p1 = parsed.previews[0];
  assert.equal(p1.importedName, "Nadia Putri");
  assert.equal(p1.isMatched, true);
  assert.equal(p1.matchedPlayerId, "pl-1");
  assert.equal(p1.scores["sk-1"], 4.0);
  assert.equal(p1.scores["sk-2"], 3.0);
  assert.equal(p1.evaluation, "Bagus konsisten");

  const p2 = parsed.previews[1];
  assert.equal(p2.importedName, "Pemain Baru Tak Dikenal");
  assert.equal(p2.isMatched, false);
  assert.equal(p2.matchedPlayerId, null);
  assert.equal(parsed.unmatchedCount, 1);
});

