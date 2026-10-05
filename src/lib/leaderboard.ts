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
      const { player, history, rank } = data;

      const sessionMap = new Map<string, { title: string; points: number; date: string }>();
      history.forEach((h) => {
        const title = h.session_label || "Sesi Basecamp";
        const cur = sessionMap.get(title) || {
          title,
          points: 0,
          date: new Date(h.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
        };
        cur.points += h.points_delta;
        sessionMap.set(title, cur);
      });

      const events: PlayerEventHistory[] = Array.from(sessionMap.values()).map((e) => ({
        date: e.date,
        title: e.title,
        type:
          e.title.toLowerCase().includes("battle") || e.title.toLowerCase().includes("kompetisi")
            ? "Kompetisi"
            : "Mabar",
        stage: "Hasil Akhir",
        points: e.points >= 0 ? `+${e.points} poin` : `${e.points} poin`,
      }));

      const matches: PlayerMatchHistory[] = history.map((h) => ({
        round: h.session_label || "Match Sesi",
        court: "Basecamp Padel",
        status: "finished",
        partner: "—",
        opponents: h.opponent_label || "—",
        score: h.points_delta > 0 ? `+${h.points_delta} poin` : `${h.points_delta} poin`,
        isWin: h.result === "W",
      }));

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
