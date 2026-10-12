"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { guard, str, type Supa } from "@/lib/server/action";
import type { ActionState } from "@/lib/actionState";
import type { Serve } from "@/lib/database.types";

/** "Livestream tanpa event": a bare ON AIR match with no `event_id` — a court camera / casual match
 *  that isn't part of any event, so none of this touches the leaderboard, brackets, or mabar rounds. */

function revalidateLive(matchId?: string) {
  revalidatePath("/admin/live");
  if (matchId) revalidatePath(`/admin/live/freeform/${matchId}`);
}

/** Picked player ids (if any) win over the manual-name fallback; "Rayhan / Andra" for a pair. */
async function resolveTeam(supabase: Supa, fd: FormData, side: "a" | "b") {
  const ids = fd.getAll(`team_${side}_player_ids`).map(String).filter(Boolean);
  if (!ids.length) return { name: str(fd, `team_${side}_name`) || `Tim ${side.toUpperCase()}`, ids };
  const { data: players } = await supabase.from("players").select("id, name").in("id", ids);
  const nameOf = (id: string) => players?.find((p) => p.id === id)?.name ?? "?";
  return { name: ids.map(nameOf).join(" / "), ids };
}

export async function startFreeformMatch(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const courtId = str(fd, "court_id") || null;
    const streamUrl = str(fd, "stream_url") || null;
    const teamA = await resolveTeam(supabase, fd, "a");
    const teamB = await resolveTeam(supabase, fd, "b");

    // only one freeform match may be ON AIR per court at a time (matches_one_on_air_per_court_freeform)
    let offAir = supabase.from("matches").update({ is_live: false }).eq("is_live", true).is("event_id", null);
    offAir = courtId ? offAir.eq("court_id", courtId) : offAir.is("court_id", null);
    await offAir;

    const { data, error } = await supabase
      .from("matches")
      .insert({
        court_id: courtId,
        team_a_name: teamA.name,
        team_b_name: teamB.name,
        team_a_player_ids: teamA.ids,
        team_b_player_ids: teamB.ids,
        stream_url: streamUrl,
        session_label: "Live tanpa event",
        status: "live",
        is_live: true,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    revalidateLive();
    redirect(`/admin/live/freeform/${data.id}`);
  });
}

/** Edits team names / stream link of a running freeform match (its score is controlled by LiveControl). */
export async function updateFreeformMatch(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "match_id");
    const teamA = await resolveTeam(supabase, fd, "a");
    const teamB = await resolveTeam(supabase, fd, "b");
    const row = {
      team_a_name: teamA.name,
      team_b_name: teamB.name,
      team_a_player_ids: teamA.ids,
      team_b_player_ids: teamB.ids,
      stream_url: str(fd, "stream_url") || null,
    };
    const { error } = await supabase.from("matches").update(row).eq("id", id).is("event_id", null);
    if (error) throw new Error(error.message);
    revalidateLive(id);
  });
}

/** Quick inline rename (just the title, straight from LiveControl) — switches the match to plain-text
 *  names, clearing any previously picked player ids so they don't go stale against the new text. */
export async function renameFreeformMatch(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "match_id");
    const row = {
      team_a_name: str(fd, "team_a_name") || "Tim A",
      team_b_name: str(fd, "team_b_name") || "Tim B",
      team_a_player_ids: [] as string[],
      team_b_player_ids: [] as string[],
    };
    const { error } = await supabase.from("matches").update(row).eq("id", id).is("event_id", null);
    if (error) throw new Error(error.message);
    revalidateLive(id);
  });
}

/** "Selesaikan match" for a freeform match — just the final score, no bracket/mabar/leaderboard writes. */
export async function finishFreeformMatch(matchId: string, gamesA: number, gamesB: number, wo: Serve | null = null): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const { data: m } = await supabase.from("matches").select("event_id").eq("id", matchId).maybeSingle();
    if (!m || m.event_id) throw new Error("Match tanpa event tidak ditemukan");
    const winner: Serve | null = wo ?? (gamesA === gamesB ? null : gamesA > gamesB ? "A" : "B");
    const { error } = await supabase
      .from("matches")
      .update({ team_a_games: gamesA, team_b_games: gamesB, winner, is_wo: !!wo, status: "finished", is_live: false, timer_running: false })
      .eq("id", matchId);
    if (error) throw new Error(error.message);
    revalidateLive(matchId);
  });
}

/** Discards a freeform match entirely (no score to keep — operator just wants it gone). */
export async function deleteFreeformMatch(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "match_id");
    const { error } = await supabase.from("matches").delete().eq("id", id).is("event_id", null);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/live");
    redirect("/admin/live");
  });
}
