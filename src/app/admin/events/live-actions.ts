"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { matchSection } from "@/lib/compLabels";
import { courtLabel } from "@/lib/format";
import { findTeamClash } from "@/lib/matchRules";
import type { Match } from "@/lib/database.types";
import type { ActionState } from "@/lib/actionState";
import { guard, revalidateEvent, str, type Supa } from "./_shared";

/**
 * Running a match (kompetisi and mabar): "Mulai" (playing, off air) and ON AIR. Several matches of an
 * event can be ON AIR, one per court; the unique index of 0008_on_air_per_court.sql backs this up.
 */

async function loadMatch(supabase: Supa, matchId: string) {
  const { data: m } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle();
  if (!m) throw new Error("Match tidak ditemukan");
  return m;
}

/** Refuses to start a match while one of its teams/players is still playing (see findTeamClash). */
async function assertTeamsFree(supabase: Supa, m: Match) {
  if (!m.event_id) return;
  const { data: running } = await supabase.from("matches").select("*").eq("event_id", m.event_id).eq("status", "live").neq("id", m.id);
  const clash = findTeamClash(m, running ?? []);
  if (!clash) return;
  const o = clash.with;
  const { data: court } = o.court_id ? await supabase.from("courts").select("name").eq("id", o.court_id).maybeSingle() : { data: null };
  const where = [matchSection(o), court ? courtLabel(court.name) : null].filter(Boolean).join(" · ");
  const who = clash.side === "A" ? m.team_a_name : m.team_b_name;
  throw new Error(`${who} masih main di ${where} (${o.team_a_name} vs ${o.team_b_name}). Selesaikan match itu dulu.`);
}

/** ON AIR (overlays and the home Live card follow it), started if it wasn't; takes the court's previous match off air. */
async function putOnAir(supabase: Supa, eventId: string, matchId: string) {
  const m = await loadMatch(supabase, matchId);
  if (m.status === "finished") throw new Error("Match sudah selesai.");
  if (m.status === "scheduled") await assertTeamsFree(supabase, m);
  let sameCourt = supabase.from("matches").update({ is_live: false }).eq("event_id", eventId).eq("is_live", true).neq("id", matchId);
  sameCourt = m.court_id ? sameCourt.eq("court_id", m.court_id) : sameCourt.is("court_id", null);
  await sameCourt;
  const { error } = await supabase.from("matches").update({ is_live: true, status: "live" }).eq("id", matchId).neq("status", "finished");
  if (error) throw new Error(error.message);
}

/** "Live-kan" on the Live page: put this match ON AIR (`open=1` then opens its score control). */
export async function goLive(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "event_id");
    const matchId = str(fd, "match_id");
    await putOnAir(supabase, id, matchId);
    revalidateEvent(id);
    if (fd.get("open") === "1") redirect(`/admin/live?match=${matchId}`);
  });
}

/** "Mulai": the match is being played (scores can be entered) but stays OFF AIR. */
export async function startMatch(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const m = await loadMatch(supabase, str(fd, "match_id"));
    if (m.status !== "scheduled") return;
    await assertTeamsFree(supabase, m);
    const { error } = await supabase.from("matches").update({ status: "live" }).eq("id", m.id).eq("status", "scheduled");
    if (error) throw new Error(error.message);
    if (m.event_id) revalidateEvent(m.event_id);
  });
}

/** ON AIR switch of a running match (Match tab, mabar court cards). */
export async function setOnAir(eventId: string, matchId: string, on: boolean): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    if (on) await putOnAir(supabase, eventId, matchId);
    else {
      const { error } = await supabase.from("matches").update({ is_live: false }).eq("id", matchId).eq("event_id", eventId);
      if (error) throw new Error(error.message);
    }
    revalidateEvent(eventId);
  });
}
