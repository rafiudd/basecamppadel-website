/**
 * "Journey pin" tab (no imports, unit-tested with `npm test`): per-skill missions a player needs to
 * clear to reach the next pin, shown as a preview/progress view on the profile.
 *
 * DRAFT CONTENT — review with the coaching team before this ever decides a real level. Today
 * players.level still comes from computePlayerLevel's average-score gate (src/lib/coaching.ts); this
 * file only renders a forward-looking "what's next" view on top of it. The Kuning → Biru row is the
 * one pattern we got from the design handoff; Putih → Kuning, Biru → Merah and Merah → Hitam are this
 * file's author's draft extension of that pattern (carry over the previous tier's core skills at a
 * higher bar, introduce the next tier's signature skills at a lower bar) and are the first thing to
 * get corrected once a coach reviews real thresholds.
 */

export type PlayerLevelName = "Rookie" | "Beginner" | "Low Bronze" | "Bronze" | "Silver";

export const PIN_JOURNEY_LEVELS: PlayerLevelName[] = ["Rookie", "Beginner", "Low Bronze", "Bronze", "Silver"];

export const PIN_JOURNEY_PIN: Record<PlayerLevelName, string> = {
  Rookie: "Putih",
  Beginner: "Kuning",
  "Low Bronze": "Biru",
  Bronze: "Merah",
  Silver: "Hitam",
};

/** The level reached once every mission below is cleared, or null for the top pin. */
export function nextPinLevel(level: PlayerLevelName): PlayerLevelName | null {
  const i = PIN_JOURNEY_LEVELS.indexOf(level);
  return i >= 0 && i < PIN_JOURNEY_LEVELS.length - 1 ? PIN_JOURNEY_LEVELS[i + 1] : null;
}

export type PinMission = { skill: string; minScore: number } | { sessions: number };

/** Missions to clear while sitting at this level, to reach the next pin. Empty at the top pin. */
export const PIN_MISSIONS: Record<PlayerLevelName, PinMission[]> = {
  Rookie: [
    { skill: "Forehand", minScore: 2.0 },
    { skill: "Backhand", minScore: 2.0 },
    { skill: "Servis", minScore: 2.0 },
    { skill: "Return servis", minScore: 1.5 },
    { skill: "Positioning", minScore: 1.5 },
    { sessions: 2 },
  ],
  Beginner: [
    { skill: "Forehand", minScore: 3.5 },
    { skill: "Volley BH", minScore: 3.0 },
    { skill: "Backwall FH", minScore: 3.0 },
    { skill: "Transisi", minScore: 3.0 },
    { skill: "Backwall BH", minScore: 3.0 },
    { skill: "Double glass", minScore: 2.5 },
    { skill: "Block", minScore: 3.0 },
    { sessions: 3 },
  ],
  "Low Bronze": [
    { skill: "Bandeja", minScore: 4.0 },
    { skill: "Víbora", minScore: 3.5 },
    { skill: "Smash datar", minScore: 3.5 },
    { skill: "Bajada", minScore: 3.3 },
    { skill: "Chiquita", minScore: 3.3 },
    { skill: "Dejada (drop volley)", minScore: 3.5 },
    { skill: "Pemilihan pukulan", minScore: 3.5 },
    { sessions: 4 },
  ],
  Bronze: [
    { skill: "Smash x3 / x4", minScore: 4.5 },
    { skill: "Rulo", minScore: 4.0 },
    { skill: "Gancho", minScore: 4.0 },
    { skill: "Contrapared", minScore: 4.0 },
    { skill: "Passing shot", minScore: 4.3 },
    { skill: "Baca permainan lawan", minScore: 4.3 },
    { sessions: 5 },
  ],
  Silver: [],
};

/** What's taught at each pin — descriptive only, not tied to the missions above. */
export const PIN_LEARNING_POINTS: Record<PlayerLevelName, string[]> = {
  Rookie: ["Grip & posisi siap", "Forehand dasar", "Backhand dasar", "Servis", "Aturan skor"],
  Beginner: ["Forehand arah", "Backhand arah", "Volley FH/BH", "Return servis", "Lob dasar", "Naik ke net bareng"],
  "Low Bronze": ["Backwall FH/BH", "Double glass", "Side wall", "Block", "Lob defensif", "Bandeja dasar", "Transisi"],
  Bronze: ["Bandeja", "Víbora", "Smash datar", "Bajada", "Chiquita", "Dejada", "Pemilihan pukulan"],
  Silver: ["Smash x3/x4", "Rulo", "Gancho", "Contrapared", "Passing shot", "Strategi per lawan"],
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export type MissionStatus = {
  label: string;
  done: boolean;
  /** 0..1, how far toward clearing the mission (session missions count partial progress too). */
  progress: number;
  /** "4 / ≥ 3,5", "3 / 3 sesi" */
  detail: string;
  /** null once done or unrated; otherwise how much more is needed. */
  gapLabel: string | null;
};

/**
 * Each mission's live status for a player: `skillScores` is every skill's latest score by its exact
 * `coaching_skills.name` (null/missing = not yet rated), `sessionsCount` the player's submitted
 * coaching sessions so far.
 */
export function evaluateMissions(
  missions: PinMission[],
  skillScores: Record<string, number | null | undefined>,
  sessionsCount: number,
): MissionStatus[] {
  return missions.map((m) => {
    if ("sessions" in m) {
      const done = sessionsCount >= m.sessions;
      return {
        label: "Ikut sesi Mabar with Coach",
        done,
        progress: Math.min(1, sessionsCount / m.sessions),
        detail: `${Math.min(sessionsCount, m.sessions)} / ${m.sessions} sesi`,
        gapLabel: done ? null : `${m.sessions - sessionsCount} sesi lagi`,
      };
    }
    const score = skillScores[m.skill] ?? null;
    const done = score !== null && score >= m.minScore;
    return {
      label: m.skill,
      done,
      progress: score === null ? 0 : Math.min(1, score / m.minScore),
      detail: score === null ? `≥ ${m.minScore}` : `${score} / ≥ ${m.minScore}`,
      gapLabel: done ? null : score === null ? "belum dinilai" : `kurang ${round1(m.minScore - score)}`,
    };
  });
}

/** The mission closest to done, to suggest as "tips dari coach" (rated-and-short first, else any unmet). */
export function closestMission(statuses: MissionStatus[]): MissionStatus | null {
  const unmet = statuses.filter((s) => !s.done);
  if (!unmet.length) return null;
  const rated = unmet.filter((s) => s.gapLabel !== "belum dinilai" && !s.gapLabel?.endsWith("sesi lagi"));
  const pool = rated.length ? rated : unmet;
  return pool.reduce((best, s) => (s.progress > best.progress ? s : best), pool[0]);
}
