/**
 * Coaching & Penilaian System
 * Rules: .task/penilaian.md & .task/admin-coaching.md
 */

export type SkillType = "teknik" | "in_game";

export interface CoachingSkill {
  id: string;
  type: SkillType;
  category: string;
  name: string;
  sort_order: number;
  active: boolean;
  created_at?: string;
}

export type PlayerLevelName = "Rookie" | "Beginner" | "Low Bronze" | "Bronze" | "Silver";

export interface LevelInfo {
  name: PlayerLevelName;
  color: string;
  textColor: string;
  bgClass: string;
  minAvg: number;
}

export const LEVEL_DEFINITIONS: Record<PlayerLevelName, LevelInfo> = {
  Rookie: {
    name: "Rookie",
    color: "#FBF7F1",
    textColor: "#17151F",
    bgClass: "bg-snow",
    minAvg: 1.0,
  },
  Beginner: {
    name: "Beginner",
    color: "#FFD43B",
    textColor: "#17151F",
    bgClass: "bg-volt",
    minAvg: 2.0,
  },
  "Low Bronze": {
    name: "Low Bronze",
    color: "#2563EB",
    textColor: "#FFFFFF",
    bgClass: "bg-blue-600",
    minAvg: 3.0,
  },
  Bronze: {
    name: "Bronze",
    color: "#EF4444",
    textColor: "#FFFFFF",
    bgClass: "bg-coral",
    minAvg: 3.8,
  },
  Silver: {
    name: "Silver",
    color: "#17151F",
    textColor: "#FBF7F1",
    bgClass: "bg-ink",
    minAvg: 4.5,
  },
};

export const LEVEL_NAMES: PlayerLevelName[] = ["Rookie", "Beginner", "Low Bronze", "Bronze", "Silver"];

/**
 * B.4 Hitung level
 * - Rookie = Putih
 * - Beginner = Kuning
 * - Low Bronze = Biru
 * - Bronze = Merah
 * - Silver = Hitam
 * - Level dihitung dari nilai, bukan dari grup.
 * - Bronze ke atas wajib punya data mabar.
 * - Admin bisa override level, dengan alasan wajib diisi.
 */
export function computePlayerLevel(
  scores: Record<string, number | null | undefined> | undefined | null,
  options?: {
    hasMabarData?: boolean;
    overrideLevel?: string | null;
    overrideReason?: string | null;
    currentLevel?: string | null;
  }
): {
  level: PlayerLevelName;
  color: string;
  averageScore: number | null;
  rawLevel: PlayerLevelName;
  isOverridden: boolean;
  overrideReason?: string;
  cappedByMabar: boolean;
} {
  const hasMabarData = options?.hasMabarData ?? true;
  const overrideLevel = options?.overrideLevel?.trim();
  const overrideReason = options?.overrideReason?.trim();

  // If valid override is specified with non-empty reason
  if (overrideLevel && LEVEL_NAMES.includes(overrideLevel as PlayerLevelName) && overrideReason) {
    const validLevel = overrideLevel as PlayerLevelName;
    return {
      level: validLevel,
      color: LEVEL_DEFINITIONS[validLevel].color,
      averageScore: null,
      rawLevel: validLevel,
      isOverridden: true,
      overrideReason,
      cappedByMabar: false,
    };
  }

  // Calculate average of numeric non-zero scores
  const numericScores: number[] = [];
  if (scores) {
    for (const val of Object.values(scores)) {
      if (typeof val === "number" && !isNaN(val) && val > 0) {
        numericScores.push(val);
      }
    }
  }

  if (numericScores.length === 0) {
    // If no scores, keep current level or fallback to Rookie / Beginner
    const fallback = (options?.currentLevel && LEVEL_NAMES.includes(options.currentLevel as PlayerLevelName))
      ? (options.currentLevel as PlayerLevelName)
      : "Beginner";
    return {
      level: fallback,
      color: LEVEL_DEFINITIONS[fallback].color,
      averageScore: null,
      rawLevel: fallback,
      isOverridden: false,
      cappedByMabar: false,
    };
  }

  const avg = numericScores.reduce((acc, s) => acc + s, 0) / numericScores.length;
  const roundedAvg = Math.round(avg * 100) / 100;

  let rawLevel: PlayerLevelName = "Rookie";
  if (roundedAvg >= 4.5) {
    rawLevel = "Silver";
  } else if (roundedAvg >= 3.8) {
    rawLevel = "Bronze";
  } else if (roundedAvg >= 3.0) {
    rawLevel = "Low Bronze";
  } else if (roundedAvg >= 2.0) {
    rawLevel = "Beginner";
  } else {
    rawLevel = "Rookie";
  }

  let finalLevel = rawLevel;
  let cappedByMabar = false;

  // "Bronze ke atas wajib punya data mabar"
  if ((rawLevel === "Bronze" || rawLevel === "Silver") && !hasMabarData) {
    finalLevel = "Low Bronze";
    cappedByMabar = true;
  }

  return {
    level: finalLevel,
    color: LEVEL_DEFINITIONS[finalLevel].color,
    averageScore: roundedAvg,
    rawLevel,
    isOverridden: false,
    cappedByMabar,
  };
}

/**
 * B.3 Nilai per pemain
 * Tanda ▲ dihitung dari selisih dengan nilai di sesi sebelumnya.
 * Nilai yang masih draft tidak ikut dihitung.
 */
export function computeScoreDelta(
  currentScore: number | null | undefined,
  prevScore: number | null | undefined
): {
  delta: number | null;
  symbol: "▲" | "▼" | "=" | null;
  formatted: string | null;
} {
  if (
    currentScore === null ||
    currentScore === undefined ||
    prevScore === null ||
    prevScore === undefined ||
    isNaN(currentScore) ||
    isNaN(prevScore) ||
    currentScore <= 0 ||
    prevScore <= 0
  ) {
    return { delta: null, symbol: null, formatted: null };
  }

  const diff = Math.round((currentScore - prevScore) * 10) / 10;
  if (diff > 0) {
    return { delta: diff, symbol: "▲", formatted: `▲ +${diff}` };
  } else if (diff < 0) {
    return { delta: diff, symbol: "▼", formatted: `▼ ${diff}` };
  } else {
    return { delta: 0, symbol: "=", formatted: "= 0" };
  }
}

/** One tab per coaching session status, in lifecycle order. */
export const SESSION_TABS = ["draft", "berjalan", "selesai"] as const;
export type SessionTab = (typeof SESSION_TABS)[number];

const TAB_STATUS: Record<SessionTab, string> = { draft: "draft", berjalan: "active", selesai: "finished" };

/** Sessions grouped by tab (= status). Order follows the input. */
export function splitSessionsByStatus<T extends { status: string }>(sessions: T[]): Record<SessionTab, T[]> {
  return {
    draft: sessions.filter((s) => s.status === TAB_STATUS.draft),
    berjalan: sessions.filter((s) => s.status === TAB_STATUS.berjalan),
    selesai: sessions.filter((s) => s.status === TAB_STATUS.selesai),
  };
}

/**
 * Which tab to open: the one asked for, else the one holding the asked session, else the first
 * non-empty of Berjalan, Draft, Selesai (Berjalan when all are empty).
 */
export function pickSessionTab(split: Record<SessionTab, { id: string }[]>, asked?: string, sessionId?: string): SessionTab {
  const asTab = SESSION_TABS.find((t) => t === asked);
  if (asTab) return asTab;
  const holding = sessionId && SESSION_TABS.find((t) => split[t].some((s) => s.id === sessionId));
  if (holding) return holding;
  return (["berjalan", "draft", "selesai"] as const).find((t) => split[t].length) ?? "berjalan";
}
