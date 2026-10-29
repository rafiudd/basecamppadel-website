import type { CoachingSkill, Player } from "@/lib/database.types";

async function getXlsx() {
  return await import("xlsx");
}

export type PlayerLevelName = "Rookie" | "Beginner" | "Low Bronze" | "Bronze" | "Silver";

function computeSimpleLevel(scores: Record<string, number>): PlayerLevelName {
  const vals = Object.values(scores).filter((v) => typeof v === "number" && v > 0);
  if (vals.length === 0) return "Beginner";
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (avg >= 4.5) return "Silver";
  if (avg >= 3.8) return "Bronze";
  if (avg >= 3.0) return "Low Bronze";
  if (avg >= 2.0) return "Beginner";
  return "Rookie";
}

export interface RekapRowPreview {
  rowIndex: number;
  importedName: string;
  matchedPlayerId: string | null;
  matchedPlayerName: string | null;
  isMatched: boolean;
  groupName: string;
  coachName: string;
  scores: Record<string, number>;
  evaluation: string;
  nextPractice: string;
  computedLevel?: PlayerLevelName;
}

/**
 * Generate Rekap Clinic Excel buffer (lazy-loads xlsx library on demand).
 */
export async function generateRekapClinicExcel(params: {
  sessionTitle: string;
  sessionDate: string;
  venueName?: string;
  skills: CoachingSkill[];
  rows: Array<{
    playerName: string;
    groupName?: string;
    coachName?: string;
    scores: Record<string, number>;
    evaluation?: string;
    nextPractice?: string;
    computedLevel?: string;
    overrideLevel?: string;
    overrideReason?: string;
  }>;
}): Promise<Uint8Array> {
  const { sessionTitle, sessionDate, venueName, skills, rows } = params;

  // Header row
  const headers = [
    "Nama Pemain",
    "Grup",
    "Coach",
    ...skills.map((s) => s.name),
    "Evaluasi",
    "Latihan Berikutnya",
    "Level",
    "Override Level",
    "Alasan Override",
  ];

  const sheetData: any[][] = [
    [`REKAP CLINIC COACHING — BASECAMP PADEL`],
    [`Sesi: ${sessionTitle}`, `Tanggal: ${sessionDate}`, `Venue: ${venueName || "-"}`],
    [], // empty line
    headers,
  ];

  for (const r of rows) {
    const rowValues = [
      r.playerName,
      r.groupName || "",
      r.coachName || "",
      ...skills.map((s) => {
        const val = r.scores[s.id] ?? r.scores[s.name];
        return val !== undefined && val !== null ? val : "";
      }),
      r.evaluation || "",
      r.nextPractice || "",
      r.computedLevel || "",
      r.overrideLevel || "",
      r.overrideReason || "",
    ];
    sheetData.push(rowValues);
  }

  const XLSX = await getXlsx();
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Column widths
  ws["!cols"] = [
    { wch: 22 }, // Nama
    { wch: 12 }, // Grup
    { wch: 14 }, // Coach
    ...skills.map(() => ({ wch: 12 })),
    { wch: 35 }, // Evaluasi
    { wch: 30 }, // Latihan berikutnya
    { wch: 12 }, // Level
    { wch: 14 }, // Override
    { wch: 25 }, // Alasan
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Rekap Clinic");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return buffer;
}

/**
 * Generate blank template Excel buffer for Import Rekap.
 */
export async function generateRekapTemplateExcel(skills: CoachingSkill[]): Promise<Uint8Array> {
  const headers = [
    "Nama Pemain",
    "Grup",
    "Coach",
    ...skills.map((s) => s.name),
    "Evaluasi",
    "Latihan Berikutnya",
  ];

  const sampleRow1 = [
    "Contoh: Nadia Putri",
    "Grup 1",
    "Dani",
    ...skills.map((_, i) => (i < 8 ? 3.5 : "")),
    "Forehand stabil & terarah. Sering deadzone saat defend.",
    "Saat defend, mundur dekat kaca. Latih backwall BH.",
  ];

  const sampleRow2 = [
    "Contoh: Salsa Amalia",
    "Grup 1",
    "Dani",
    ...skills.map((_, i) => (i < 8 ? 3.0 : "")),
    "Volley net bagus, perlu perbaiki timing smash.",
    "Latihan footwork dan recovery setelah smash.",
  ];

  const sheetData: any[][] = [
    ["TEMPLATE REKAP CLINIC COACHING — BASECAMP PADEL"],
    ["Petunjuk: Isi nilai 1.0 - 5.0 (langkah 0.5). Kosongkan kolom jika teknik tidak dinilai pada sesi ini."],
    [], // empty row
    headers,
    sampleRow1,
    sampleRow2,
    ["", "", "", ...skills.map(() => ""), "", ""],
    ["", "", "", ...skills.map(() => ""), "", ""],
    ["", "", "", ...skills.map(() => ""), "", ""],
  ];

  const XLSX = await getXlsx();
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws["!cols"] = [
    { wch: 24 }, // Nama
    { wch: 12 }, // Grup
    { wch: 14 }, // Coach
    ...skills.map(() => ({ wch: 13 })),
    { wch: 38 }, // Evaluasi
    { wch: 35 }, // Latihan berikutnya
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Template Import");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return buffer;
}

/**
 * Parse uploaded Rekap Clinic Excel file.
 */
export async function parseRekapClinicExcel(
  buffer: Buffer | Uint8Array,
  allSkills: CoachingSkill[],
  allPlayers: Pick<Player, "id" | "name" | "level">[]
): Promise<{
  success: boolean;
  error?: string;
  previews: RekapRowPreview[];
  unmatchedCount: number;
}> {
  try {
    const XLSX = await getXlsx();
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return { success: false, error: "File Excel kosong", previews: [], unmatchedCount: 0 };

    const ws = wb.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    // Find header row by searching for "Nama Pemain" or "Nama"
    let headerRowIdx = -1;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row.some((cell) => typeof cell === "string" && /nama(\s+pemain)?/i.test(cell.trim()))) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) {
      return {
        success: false,
        error: "Kolom 'Nama Pemain' tidak ditemukan dalam template Excel.",
        previews: [],
        unmatchedCount: 0,
      };
    }

    const headerRow = data[headerRowIdx].map((c) => String(c).trim());
    const nameColIdx = headerRow.findIndex((c) => /nama(\s+pemain)?/i.test(c));
    const groupColIdx = headerRow.findIndex((c) => /grup/i.test(c));
    const coachColIdx = headerRow.findIndex((c) => /coach/i.test(c));
    const evalColIdx = headerRow.findIndex((c) => /evaluasi/i.test(c));
    const nextColIdx = headerRow.findIndex((c) => /latihan(\s+berikutnya)?/i.test(c));

    // Map skill columns
    const skillColMap: Array<{ colIdx: number; skillId: string; skillName: string }> = [];
    allSkills.forEach((skill) => {
      const colIdx = headerRow.findIndex(
        (c) => c.toLowerCase() === skill.name.toLowerCase()
      );
      if (colIdx >= 0) {
        skillColMap.push({ colIdx, skillId: skill.id, skillName: skill.name });
      }
    });

    const previews: RekapRowPreview[] = [];
    let unmatchedCount = 0;

    for (let r = headerRowIdx + 1; r < data.length; r++) {
      const row = data[r];
      const rawName = String(row[nameColIdx] || "").trim();
      if (!rawName) continue;

      // Match player by name (exact or case-insensitive)
      const matched = allPlayers.find(
        (p) => p.name.trim().toLowerCase() === rawName.toLowerCase()
      );

      const groupName = groupColIdx >= 0 ? String(row[groupColIdx] || "").trim() : "";
      const coachName = coachColIdx >= 0 ? String(row[coachColIdx] || "").trim() : "";
      const evaluation = evalColIdx >= 0 ? String(row[evalColIdx] || "").trim() : "";
      const nextPractice = nextColIdx >= 0 ? String(row[nextColIdx] || "").trim() : "";

      // Extract scores (scale 1 - 5, step 0.5)
      const scores: Record<string, number> = {};
      for (const sm of skillColMap) {
        const val = row[sm.colIdx];
        if (val !== "" && val !== null && val !== undefined) {
          const num = parseFloat(String(val).replace(",", "."));
          if (!isNaN(num) && num >= 1 && num <= 5) {
            // Round to nearest 0.5
            const rounded = Math.round(num * 2) / 2;
            scores[sm.skillId] = rounded;
          }
        }
      }

      if (!matched) unmatchedCount++;

      const computedLevel = computeSimpleLevel(scores);

      previews.push({
        rowIndex: r,
        importedName: rawName,
        matchedPlayerId: matched?.id || null,
        matchedPlayerName: matched?.name || null,
        isMatched: !!matched,
        groupName,
        coachName,
        scores,
        evaluation,
        nextPractice,
        computedLevel,
      });
    }

    return {
      success: true,
      previews,
      unmatchedCount,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Gagal membaca file Excel",
      previews: [],
      unmatchedCount: 0,
    };
  }
}
