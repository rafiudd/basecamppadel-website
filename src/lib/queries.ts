import { createClient } from "@/lib/supabase/server";
import type { Player } from "@/lib/database.types";

export async function getLiveMatch() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("*")
    .eq("is_live", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getPublishedSessions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sessions")
    .select("*")
    .eq("published", true)
    .order("session_date", { ascending: true });
  return data ?? [];
}

export async function getActivePlayers(): Promise<Player[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("players")
    .select("*")
    .eq("active", true)
    .order("points", { ascending: false })
    .order("name", { ascending: true });
  return data ?? [];
}

export type RankedPlayer = Player & { rank: number };

export function rankByGender(players: Player[]) {
  const rank = (list: Player[]): RankedPlayer[] =>
    list
      .slice()
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
      .map((p, i) => ({ ...p, rank: i + 1 }));
  return {
    men: rank(players.filter((p) => p.gender === "M")),
    women: rank(players.filter((p) => p.gender === "F")),
  };
}

export async function getPlayerWithHistory(playerId: string) {
  const supabase = await createClient();
  const [{ data: player }, { data: history }, players] = await Promise.all([
    supabase.from("players").select("*").eq("id", playerId).maybeSingle(),
    supabase
      .from("match_history")
      .select("*")
      .eq("player_id", playerId)
      .order("created_at", { ascending: false }),
    getActivePlayers(),
  ]);
  if (!player) return null;
  const { men, women } = rankByGender(players);
  const group = player.gender === "F" ? women : men;
  const rank = group.find((p) => p.id === player.id)?.rank ?? group.length + 1;
  return { player, history: history ?? [], rank };
}
