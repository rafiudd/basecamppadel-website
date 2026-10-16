/**
 * Pure league logic (standings aggregation, point rules, and ranking).
 * No I/O, no database imports, so it can be unit-tested directly with `npm test`.
 */

export type FinalStage = "champion" | "runner_up" | "sf" | "qf" | "r16" | "group";

export type LeaguePoints = Record<FinalStage, number>;

export const DEFAULT_LEAGUE_POINTS: LeaguePoints = {
  champion: 25,
  runner_up: 20,
  sf: 15,
  qf: 5,
  r16: 1,
  group: 1,
};

export type PlayerVolumeResult = {
  playerId: string;
  playerName: string;
  volumeNumber: number;
  stage: FinalStage;
  isProvisional: boolean;
};

export type PlayerVolumeScore = {
  points: number;
  isProvisional: boolean;
  stage: FinalStage;
};

export type LeagueStandingRow = {
  rank: number;
  playerId: string;
  playerName: string;
  volumeScores: Record<number, PlayerVolumeScore>;
  totalPoints: number;
  hasProvisional: boolean;
};

export function computeLeagueStandings(
  results: PlayerVolumeResult[],
  pointsRules: LeaguePoints = DEFAULT_LEAGUE_POINTS,
): LeagueStandingRow[] {
  const map = new Map<
    string,
    {
      playerId: string;
      playerName: string;
      volumeScores: Record<number, PlayerVolumeScore>;
      totalPoints: number;
      hasProvisional: boolean;
      counts: Record<FinalStage, number>;
    }
  >();

  for (const r of results) {
    if (!map.has(r.playerId)) {
      map.set(r.playerId, {
        playerId: r.playerId,
        playerName: r.playerName,
        volumeScores: {},
        totalPoints: 0,
        hasProvisional: false,
        counts: { champion: 0, runner_up: 0, sf: 0, qf: 0, r16: 0, group: 0 },
      });
    }

    const p = map.get(r.playerId)!;
    const pts = pointsRules[r.stage] ?? 0;
    p.volumeScores[r.volumeNumber] = {
      points: pts,
      isProvisional: r.isProvisional,
      stage: r.stage,
    };
    p.totalPoints += pts;
    p.counts[r.stage] = (p.counts[r.stage] || 0) + 1;
    if (r.isProvisional) p.hasProvisional = true;
  }

  const rows = Array.from(map.values());
  rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.counts.champion !== a.counts.champion) return b.counts.champion - a.counts.champion;
    if (b.counts.runner_up !== a.counts.runner_up) return b.counts.runner_up - a.counts.runner_up;
    if (b.counts.sf !== a.counts.sf) return b.counts.sf - a.counts.sf;
    if (b.counts.qf !== a.counts.qf) return b.counts.qf - a.counts.qf;
    return a.playerName.localeCompare(b.playerName);
  });

  let currentRank = 1;
  return rows.map((r, i) => {
    if (i > 0 && r.totalPoints < rows[i - 1].totalPoints) {
      currentRank = i + 1;
    }
    return {
      rank: currentRank,
      playerId: r.playerId,
      playerName: r.playerName,
      volumeScores: r.volumeScores,
      totalPoints: r.totalPoints,
      hasProvisional: r.hasProvisional,
    };
  });
}

export type LiveStageMatch = {
  stage: string | null;
  status: string;
  is_live?: boolean | null;
  is_bye?: boolean | null;
};

/**
 * Determines the currently active stage being played for an event.
 */
export function determineLiveStage(matches: LiveStageMatch[]): string {
  if (!matches || matches.length === 0) return "sf";

  // 1. Any match currently live
  const liveMatch = matches.find((m) => (m.is_live || m.status === "live") && m.stage);
  if (liveMatch?.stage) return liveMatch.stage;

  // 2. Earliest uncompleted stage in tournament progression
  const stageOrder = ["group", "r16", "qf", "sf", "final"];
  for (const s of stageOrder) {
    const uncompleted = matches.find((m) => m.stage === s && m.status !== "finished" && !m.is_bye);
    if (uncompleted) return s;
  }

  // 3. If all matches finished or final reached
  return "final";
}

/**
 * Formats a stage code into its user-friendly Indonesian representation.
 */
export function formatStageLabel(stage: string | null | undefined): string {
  switch (stage) {
    case "group":
      return "Fase grup";
    case "r16":
      return "Babak 16 besar";
    case "qf":
      return "Perempat final";
    case "sf":
      return "Semifinal";
    case "final":
      return "Final";
    default:
      return "Semifinal";
  }
}

