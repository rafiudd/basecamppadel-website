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

/** The pin a player wears for each level (what players see; the level name stays for admins). */
export const LEVEL_PIN: Record<PlayerLevelName, string> = {
  Rookie: "Putih",
  Beginner: "Kuning",
  "Low Bronze": "Biru",
  Bronze: "Merah",
  Silver: "Hitam",
};

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

export type SessionStatus = "draft" | "active" | "finished";

/** coaching_sessions.status behind each tab. */
export const TAB_STATUS: Record<SessionTab, SessionStatus> = { draft: "draft", berjalan: "active", selesai: "finished" };

/** Session status, derived from assessment progress instead of a manual switch: nobody rated yet
 *  is still draft, at least one player rated moves it to active, everybody submitted finishes it. */
export function deriveSessionStatus(totalPlayers: number, ratedPlayers: number, submittedPlayers: number): SessionStatus {
  if (totalPlayers > 0 && submittedPlayers >= totalPlayers) return "finished";
  if (ratedPlayers > 0) return "active";
  return "draft";
}

/** The tab a session with this status sits in. */
export function statusTab(status: SessionStatus): SessionTab {
  return SESSION_TABS.find((t) => TAB_STATUS[t] === status) ?? "draft";
}

/**
 * Which tab to open: `holding` — the tab of the open session (its status may have just auto-changed —
 * see deriveSessionStatus — so a stale `?when=` from before that move must not strand the view on
 * an empty tab), else the one asked for, else the first non-empty of Berjalan, Draft, Selesai
 * (Berjalan when all are empty). `counts` is the number of sessions per tab.
 */
export function pickSessionTab(counts: Record<SessionTab, number>, asked?: string, holding?: SessionTab | null): SessionTab {
  if (holding) return holding;
  const asTab = SESSION_TABS.find((t) => t === asked);
  if (asTab) return asTab;
  return (["berjalan", "draft", "selesai"] as const).find((t) => counts[t] > 0) ?? "berjalan";
}

/** Server-side sort keys of the coaching session list. */
export const SESSION_SORTS = ["date", "title", "venue", "participants"] as const;
export type SessionSort = (typeof SESSION_SORTS)[number];
export type SortDir = "asc" | "desc";

/** Paging / search / sort state of the session list, read from and written to the URL. */
export type SessionListQuery = { q: string; sort: SessionSort; dir: SortDir; page: number };

/** Date sorts newest first by default, text columns A→Z. */
export const defaultSessionDir = (sort: SessionSort): SortDir => (sort === "date" ? "desc" : "asc");

export function parseSessionListQuery(params: { q?: string; sort?: string; dir?: string; page?: string }): SessionListQuery {
  const sort = SESSION_SORTS.find((s) => s === params.sort) ?? "date";
  const dir = params.dir === "asc" || params.dir === "desc" ? params.dir : defaultSessionDir(sort);
  return { q: (params.q ?? "").trim(), sort, dir, page: Math.max(1, Math.floor(Number(params.page)) || 1) };
}

/** URL of the session list in `tab` with this query — defaults are left out to keep links short. */
export function sessionListHref(tab: SessionTab, query: Partial<SessionListQuery> = {}): string {
  const p = new URLSearchParams({ when: tab });
  const sort = query.sort ?? "date";
  if (query.q) p.set("q", query.q);
  if (sort !== "date") p.set("sort", sort);
  if (query.dir && query.dir !== defaultSessionDir(sort)) p.set("dir", query.dir);
  if (query.page && query.page > 1) p.set("page", String(query.page));
  return `/admin/coaching?${p}`;
}
