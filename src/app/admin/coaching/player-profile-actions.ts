"use server";

import { requireAdminOrCoach } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type PlayerCoachingHistoryItem = {
  id: string;
  sessionTitle: string;
  sessionDate: string | null;
  coachName: string;
  status: "draft" | "submitted";
  evaluation: string;
  nextPractice: string;
};

export type PlayerCoachingProfile = {
  player: { id: string; name: string; gender: "M" | "F"; level: string; region: string; photo_url: string | null };
  /** Distinct coaching sessions this player has been rostered into, regardless of assessment status. */
  sessionCount: number;
  history: PlayerCoachingHistoryItem[];
};

/** "Lihat profil" popup in the coaching editor — the player's info + every past coaching note
 *  (any status, not just published ones; this is the admin/coach view, not the public one). */
export async function getPlayerCoachingProfile(playerId: string): Promise<PlayerCoachingProfile | null> {
  await requireAdminOrCoach();
  const supabase = await createClient();

  const [{ data: player }, { data: rosterRows }, { data: assessments }] = await Promise.all([
    supabase.from("players").select("id, name, gender, level, region, photo_url").eq("id", playerId).maybeSingle(),
    supabase.from("coaching_session_players").select("session_id").eq("player_id", playerId),
    supabase
      .from("coaching_assessments")
      .select("id, session_id, coach_id, evaluation, next_practice, status, created_at")
      .eq("player_id", playerId)
      .in("status", ["draft", "submitted"])
      .order("created_at", { ascending: false }),
  ]);
  if (!player) return null;

  const sessionCount = new Set((rosterRows ?? []).map((r) => r.session_id)).size;

  const sessionIds = [...new Set((assessments ?? []).map((a) => a.session_id))];
  const coachIds = [...new Set((assessments ?? []).map((a) => a.coach_id).filter((id): id is string => !!id))];
  const [{ data: sessions }, { data: coaches }] = await Promise.all([
    sessionIds.length ? supabase.from("coaching_sessions").select("id, title, session_date").in("id", sessionIds) : Promise.resolve({ data: [] }),
    coachIds.length ? supabase.from("coaches").select("id, name").in("id", coachIds) : Promise.resolve({ data: [] }),
  ]);
  const sessionById = new Map((sessions ?? []).map((s) => [s.id, s]));
  const coachById = new Map((coaches ?? []).map((c) => [c.id, c.name]));

  const history: PlayerCoachingHistoryItem[] = (assessments ?? []).map((a) => ({
    id: a.id,
    sessionTitle: sessionById.get(a.session_id)?.title || "Sesi coaching",
    sessionDate: sessionById.get(a.session_id)?.session_date ?? null,
    coachName: (a.coach_id && coachById.get(a.coach_id)) || "",
    status: a.status as "draft" | "submitted",
    evaluation: a.evaluation || "",
    nextPractice: a.next_practice || "",
  }));

  return {
    player: { id: player.id, name: player.name, gender: player.gender, level: player.level, region: player.region, photo_url: player.photo_url },
    sessionCount,
    history,
  };
}
