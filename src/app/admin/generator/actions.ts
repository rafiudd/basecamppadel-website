"use server";

import { guard, str, type Supa } from "@/lib/server/action";
import type { ActionState } from "@/lib/actionState";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { generateRound, pairKey } from "@/lib/generator";
import type { GenFormat, GenParticipant } from "@/lib/database.types";

export async function createEvent(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const format = str(fd, "format") as GenFormat;
    const courtIds = fd.getAll("court_ids").map(String).filter(Boolean);
    const { data, error } = await supabase
      .from("gen_events")
      .insert({
        title: str(fd, "title") || "Mabar",
        format,
        points_target: Number(str(fd, "points_target") || 24),
        court_ids: courtIds,
        sync_to_leaderboard: fd.get("sync_to_leaderboard") === "on",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    revalidatePath("/admin/generator");
    redirect(`/admin/generator/${data.id}`);
  });
}

export async function deleteEvent(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("gen_events").delete().eq("id", str(fd, "id"));
    if (error) throw new Error(error.message);
    revalidatePath("/admin/generator");
    redirect("/admin/generator");
  });
}

export async function addFreeParticipants(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const eventId = str(fd, "event_id");
    const playerIds = fd.getAll("player_ids").map(String);
    const guestNames = str(fd, "guests")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const rows: { event_id: string; player_id: string | null; display_name: string }[] = [];
    if (playerIds.length) {
      const { data: players } = await supabase.from("players").select("id, name").in("id", playerIds);
      for (const p of players ?? []) rows.push({ event_id: eventId, player_id: p.id, display_name: p.name });
    }
    for (const name of guestNames) rows.push({ event_id: eventId, player_id: null, display_name: name });

    if (rows.length) {
      const { error } = await supabase.from("gen_participants").insert(rows);
      if (error) throw new Error(error.message);
    }
    revalidatePath(`/admin/generator/${eventId}`);
  });
}

export async function addFixedTeam(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const eventId = str(fd, "event_id");
    const aId = str(fd, "player_a");
    const bId = str(fd, "player_b");
    if (!aId || !bId || aId === bId) throw new Error("Pilih dua pemain berbeda untuk satu tim");

    const { data: maxRow } = await supabase
      .from("gen_participants")
      .select("team_no")
      .eq("event_id", eventId)
      .order("team_no", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextTeamNo = (maxRow?.team_no ?? 0) + 1;

    const { data: players } = await supabase.from("players").select("id, name").in("id", [aId, bId]);
    const nameOf = (id: string) => players?.find((p) => p.id === id)?.name ?? "?";

    const { error } = await supabase.from("gen_participants").insert([
      { event_id: eventId, player_id: aId, display_name: nameOf(aId), team_no: nextTeamNo },
      { event_id: eventId, player_id: bId, display_name: nameOf(bId), team_no: nextTeamNo },
    ]);
    if (error) throw new Error(error.message);
    revalidatePath(`/admin/generator/${eventId}`);
  });
}

export async function removeParticipant(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const eventId = str(fd, "event_id");
    const { error } = await supabase.from("gen_participants").delete().eq("id", str(fd, "id"));
    if (error) throw new Error(error.message);
    revalidatePath(`/admin/generator/${eventId}`);
  });
}

export async function removeTeam(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const eventId = str(fd, "event_id");
    const { error } = await supabase
      .from("gen_participants")
      .delete()
      .eq("event_id", eventId)
      .eq("team_no", Number(str(fd, "team_no")));
    if (error) throw new Error(error.message);
    revalidatePath(`/admin/generator/${eventId}`);
  });
}

function bump(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

async function buildHistory(supabase: Supa, eventId: string, format: GenFormat, participants: GenParticipant[]) {
  const teamNoById = new Map(participants.map((p) => [p.id, p.team_no]));
  const history = new Map<string, number>();

  const { data: rounds } = await supabase.from("gen_rounds").select("id").eq("event_id", eventId);
  const roundIds = (rounds ?? []).map((r) => r.id);
  if (roundIds.length === 0) return history;

  const { data: matches } = await supabase
    .from("gen_matches")
    .select("team_a_participant_ids, team_b_participant_ids")
    .in("round_id", roundIds);

  for (const m of matches ?? []) {
    if (format === "americano" || format === "mexicano") {
      if (m.team_a_participant_ids.length === 2) bump(history, pairKey(m.team_a_participant_ids[0], m.team_a_participant_ids[1]));
      if (m.team_b_participant_ids.length === 2) bump(history, pairKey(m.team_b_participant_ids[0], m.team_b_participant_ids[1]));
    } else {
      const teamA = teamNoById.get(m.team_a_participant_ids[0]);
      const teamB = teamNoById.get(m.team_b_participant_ids[0]);
      if (teamA != null && teamB != null) bump(history, pairKey(String(teamA), String(teamB)));
    }
  }
  return history;
}

export async function generateNextRound(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const eventId = str(fd, "event_id");

    const { data: event } = await supabase.from("gen_events").select("*").eq("id", eventId).single();
    if (!event) throw new Error("Event tidak ditemukan");

    const { data: participants } = await supabase.from("gen_participants").select("*").eq("event_id", eventId);
    if (!participants || participants.length < 4) throw new Error("Minimal 4 peserta buat generate ronde");

    const history = await buildHistory(supabase, eventId, event.format, participants);
    const pool = participants.map((p) => ({
      id: p.id,
      team_no: p.team_no,
      total_points: p.total_points,
      sits_out_count: p.sits_out_count,
    }));
    const courtCount = event.court_ids.length || 1;
    const { pairings, benchedIds } = generateRound(event.format, pool, courtCount, history);
    if (pairings.length === 0) throw new Error("Peserta belum cukup buat generate ronde (minimal 4 per court / 2 tim per court)");

    const { data: lastRound } = await supabase
      .from("gen_rounds")
      .select("round_no")
      .eq("event_id", eventId)
      .order("round_no", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextRoundNo = (lastRound?.round_no ?? 0) + 1;

    const { data: round, error: roundErr } = await supabase
      .from("gen_rounds")
      .insert({ event_id: eventId, round_no: nextRoundNo })
      .select("id")
      .single();
    if (roundErr) throw new Error(roundErr.message);

    const courtIds: (string | null)[] = event.court_ids.length ? event.court_ids : [null];
    const matchRows = pairings.map((p, i) => ({
      round_id: round.id,
      court_id: courtIds[i % courtIds.length] ?? null,
      team_a_participant_ids: p.team_a,
      team_b_participant_ids: p.team_b,
    }));
    const { error: matchErr } = await supabase.from("gen_matches").insert(matchRows);
    if (matchErr) throw new Error(matchErr.message);

    if (benchedIds.length) {
      const benchedSet = new Set(benchedIds);
      for (const p of participants) {
        if (benchedSet.has(p.id)) {
          await supabase.from("gen_participants").update({ sits_out_count: p.sits_out_count + 1 }).eq("id", p.id);
        }
      }
    }

    if (event.status === "draft") {
      await supabase.from("gen_events").update({ status: "active" }).eq("id", eventId);
    }

    revalidatePath(`/admin/generator/${eventId}`);
  });
}

async function adjustPoints(supabase: Supa, participantIds: string[], delta: number) {
  if (!delta) return;
  const { data: rows } = await supabase.from("gen_participants").select("id, total_points").in("id", participantIds);
  for (const r of rows ?? []) {
    await supabase.from("gen_participants").update({ total_points: r.total_points + delta }).eq("id", r.id);
  }
}

export async function saveMatchScore(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const matchId = str(fd, "match_id");
    const eventId = str(fd, "event_id");
    const teamAPoints = Number(str(fd, "team_a_points"));
    const teamBPoints = Number(str(fd, "team_b_points"));

    const { data: match } = await supabase.from("gen_matches").select("*").eq("id", matchId).single();
    if (!match) throw new Error("Match tidak ditemukan");

    if (match.team_a_points != null && match.team_b_points != null) {
      await adjustPoints(supabase, match.team_a_participant_ids, -match.team_a_points);
      await adjustPoints(supabase, match.team_b_participant_ids, -match.team_b_points);
    }

    const { error } = await supabase
      .from("gen_matches")
      .update({ team_a_points: teamAPoints, team_b_points: teamBPoints })
      .eq("id", matchId);
    if (error) throw new Error(error.message);

    await adjustPoints(supabase, match.team_a_participant_ids, teamAPoints);
    await adjustPoints(supabase, match.team_b_participant_ids, teamBPoints);

    revalidatePath(`/admin/generator/${eventId}`);
  });
}

export async function finalizeEvent(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const eventId = str(fd, "event_id");

    const { data: event } = await supabase.from("gen_events").select("*").eq("id", eventId).single();
    if (!event) throw new Error("Event tidak ditemukan");

    if (event.sync_to_leaderboard) {
      const { data: participants } = await supabase
        .from("gen_participants")
        .select("*")
        .eq("event_id", eventId)
        .not("player_id", "is", null);
      for (const p of participants ?? []) {
        if (!p.player_id || !p.total_points) continue;
        const { data: player } = await supabase.from("players").select("points_adjustment").eq("id", p.player_id).maybeSingle();
        if (player) {
          await supabase
            .from("players")
            .update({ points_adjustment: player.points_adjustment + p.total_points })
            .eq("id", p.player_id);
        }
      }
    }

    const { error } = await supabase.from("gen_events").update({ status: "finished" }).eq("id", eventId);
    if (error) throw new Error(error.message);
    revalidatePath(`/admin/generator/${eventId}`);
    revalidatePath("/leaderboard");
  });
}
