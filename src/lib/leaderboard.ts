import leaderboardData from "@/data/leaderboard.json";
import { getActivePlayers, getPlayerWithHistory, rankByGender, type RankedPlayer } from "@/lib/queries";

export interface Player {
  id: string;
  rank: number;
  name: string;
  points: number;
  level: string;
  region?: string;
  photo_url?: string;
  wins: number;
  losses: number;
}

export interface PlayerEventHistory {
  date: string;
  title: string;
  type: string;
  stage: string;
  points: string;
  slug?: string;
}

export interface PlayerMatchHistory {
  round: string;
  court: string;
  status: "live" | "finished" | "next" | "waiting";
  partner: string;
  opponents: string;
  score: string;
  isWin: boolean | null;
}

export interface PlayerDetail extends Player {
  gender: string;
  city: string;
  events: PlayerEventHistory[];
  matches: PlayerMatchHistory[];
}

export interface LeaderboardData {
  men: {
    hero: Player[];
    others: Player[];
  };
  women: {
    hero: Player[];
    others: Player[];
  };
}

function toPlayer(p: RankedPlayer): Player {
  return {
    id: p.id,
    rank: p.rank,
    name: p.name,
    points: p.points,
    level: p.level || "Beginner",
    region: p.region || undefined,
    photo_url: p.photo_url || undefined,
    wins: p.wins || 0,
    losses: p.losses || 0,
  };
}

export async function getLeaderboard(): Promise<LeaderboardData> {
  try {
    const players = await getActivePlayers();
    if (players && players.length > 0) {
      const { men, women } = rankByGender(players);
      return {
        men: {
          hero: men.slice(0, 3).map(toPlayer),
          others: men.slice(3).map(toPlayer),
        },
        women: {
          hero: women.slice(0, 3).map(toPlayer),
          others: women.slice(3).map(toPlayer),
        },
      };
    }
  } catch (err) {
    console.error("Failed to fetch leaderboard from Supabase:", err);
  }

  return leaderboardData as LeaderboardData;
}

export async function getPlayerById(playerId: string): Promise<PlayerDetail | null> {
  try {
    const data = await getPlayerWithHistory(playerId);
    if (data && data.player) {
      const { player, history, rank, matchById, courtById, eventById, awards } = data;

      // Real points per event come from player_awards (match_history's points_delta is always 0 —
      // points are awarded by final rank/result, not per match), and the real event type comes from
      // the events row itself, not a guess based on words in the title.
      const events: PlayerEventHistory[] = awards.map((a) => {
        const ev = eventById.get(a.event_id);
        const date = ev?.event_date
          ? new Date(`${ev.event_date}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
          : "";
        return {
          date,
          title: ev?.title ?? "Event",
          type: ev?.type === "kompetisi" ? "Kompetisi" : "Mabar",
          stage: "Hasil Akhir",
          points: a.points >= 0 ? `+${a.points} poin` : `${a.points} poin`,
          slug: ev?.slug ?? "",
        };
      });

      const matches: PlayerMatchHistory[] = history.map((h) => {
        const m = h.match_id ? matchById.get(h.match_id) : undefined;
        const onA = m?.team_a_player_ids?.includes(player.id) ?? true;
        const mine = m ? (onA ? m.team_a_games : m.team_b_games) : null;
        const theirs = m ? (onA ? m.team_b_games : m.team_a_games) : null;
        return {
          round: m?.set_label || h.session_label || "Match",
          court: (m?.court_id && courtById.get(m.court_id)) || "Basecamp Padel",
          status: "finished",
          partner: "—",
          opponents: h.opponent_label || "—",
          score: mine != null && theirs != null ? `${mine}–${theirs}` : "—",
          isWin: h.result === "W",
        };
      });

      return {
        id: player.id,
        rank,
        name: player.name,
        points: player.points,
        level: player.level || "Beginner",
        region: player.region || "Purwokerto",
        city: player.region || "Purwokerto",
        photo_url: player.photo_url || undefined,
        wins: player.wins || 0,
        losses: player.losses || 0,
        gender: player.gender === "F" ? "Women" : "Men",
        events,
        matches,
      };
    }
  } catch (err) {
    console.error("Failed to get player by ID from Supabase:", err);
  }

  // Fallback for mock IDs
  const details = (leaderboardData.playerDetails as Record<string, PlayerDetail>)[playerId];
  if (details) return details;

  const allPlayers = [
    ...leaderboardData.men.hero,
    ...leaderboardData.men.others,
    ...leaderboardData.women.hero,
    ...leaderboardData.women.others,
  ];
  const p = allPlayers.find((item) => item.id === playerId);
  if (p) {
    return {
      ...p,
      gender: playerId.startsWith("w") ? "Women" : "Men",
      city: (p as { region?: string }).region || "Purwokerto",
      events: [],
      matches: [],
    };
  }

  return null;
}
