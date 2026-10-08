"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { ActionState } from "@/lib/actionState";
import { isAmericanoFormat, isFixedFormat } from "@/lib/events";
import { generateRound, pairKey, type Pool } from "@/lib/generator";
import { americanoSchedule, teamRoundRobin } from "@/lib/mabarRules";
import { isScored, loadMabarRounds, mabarProgress, mabarTable, unitKey } from "@/lib/mabar";
import { streamUrlFor } from "@/lib/compData";
import type { GenParticipant } from "@/lib/database.types";
import { guard, revalidateEvent, str, type Supa } from "./_shared";

/**
 * Mabar on the event page: attendance, schedule (Americano: all rounds up front; Mexicano: one round
 * at a time from the table), scores per court, substitutes, and finishing with leaderboard points.
 * Rounds live in the generator tables; every court also gets a `matches` row for live scoring.
 */

type Ctx = Awaited<ReturnType<typeof loadMabar>>;

async function loadMabar(supabase: Supa, id: string) {
  const { data: event } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!event || event.type !== "mabar" || !event.gen_event_id) throw new Error("Event mabar tidak ditemukan");
  const [data, { data: venue }] = await Promise.all([
    loadMabarRounds(supabase, event.id, event.gen_event_id),
    event.venue_id ? supabase.from("venues").select("name").eq("id", event.venue_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return { event, genId: event.gen_event_id, venueName: venue?.name ?? "", ...data };
}

function assertOpen(ctx: Ctx) {
  if (ctx.event.status === "finished") throw new Error("Event sudah selesai.");
}

const isAmericano = (ctx: Ctx) => isAmericanoFormat(ctx.event.mabar_format);

/** Who can be scheduled: checked in and not substituted. Fixed formats: pairs with both players here. */
function schedulable(ctx: Ctx) {
  const here = ctx.participants.filter((p) => p.active && p.checked_in);
  if (!isFixedFormat(ctx.event.mabar_format)) return { players: here, teams: [] as GenParticipant[][] };
  const byTeam = new Map<number, GenParticipant[]>();
  for (const p of here) if (p.team_no != null) byTeam.set(p.team_no, [...(byTeam.get(p.team_no) ?? []), p]);
  return { players: here, teams: [...byTeam.values()].filter((t) => t.length >= 2) };
}

// ---------------------------------------------------------------- writing rounds

type CourtPlan = { a: string[]; b: string[] }; // participant ids

/** One round: gen_round + a gen_match per court + its `matches` row; resting players get a bye counted. */
async function insertRound(supabase: Supa, ctx: Ctx, roundNo: number, courts: CourtPlan[], resting: string[]) {
  const { data: round, error } = await supabase.from("gen_rounds").insert({ event_id: ctx.genId, round_no: roundNo }).select("id").single();
  if (error) throw new Error(error.message);
  const courtIds: (string | null)[] = ctx.event.court_ids.length ? ctx.event.court_ids : [null];
  const { data: genMatches, error: gErr } = await supabase
    .from("gen_matches")
    .insert(courts.map((c, i) => ({ round_id: round.id, court_id: courtIds[i % courtIds.length], team_a_participant_ids: c.a, team_b_participant_ids: c.b })))
    .select("*");
  if (gErr) throw new Error(gErr.message);

  const byId = new Map(ctx.participants.map((p) => [p.id, p]));
  const names = (ids: string[]) => ids.map((id) => byId.get(id)?.display_name ?? "?").join(" & ");
  const playerIds = (ids: string[]) => ids.map((id) => byId.get(id)?.player_id).filter((p): p is string => !!p);
  const { error: mErr } = await supabase.from("matches").insert(
    (genMatches ?? []).map((g) => ({
      event_id: ctx.event.id,
      gen_match_id: g.id,
      session_label: ctx.event.title,
      set_label: `Ronde ${roundNo}`,
      venue: ctx.venueName,
      court_id: g.court_id,
      stream_url: streamUrlFor(ctx.event, g.court_id),
      team_a_name: names(g.team_a_participant_ids),
      team_b_name: names(g.team_b_participant_ids),
      team_a_player_ids: playerIds(g.team_a_participant_ids),
      team_b_player_ids: playerIds(g.team_b_participant_ids),
      status: "scheduled" as const,
    })),
  );
  if (mErr) throw new Error(mErr.message);

  for (const id of resting) {
    const p = byId.get(id);
    if (p) await supabase.from("gen_participants").update({ sits_out_count: p.sits_out_count + 1 }).eq("id", id);
  }
}

/**
 * Americano / fixed Americano: the whole schedule from the people who checked in. Neither the round
 * count nor the pairing is something the admin configures — a full cycle (everyone meets everyone
 * exactly once) is fully determined by who checked in and how many courts there are, so the generator
 * is the single source of truth: however many real rounds it took to fit every pairing is written
 * back onto the event, rather than trusting `ctx.event.rounds` (a leftover wizard-time guess).
 */
async function planWholeSchedule(supabase: Supa, ctx: Ctx, seed: number) {
  const { players, teams } = schedulable(ctx);
  const courts = ctx.event.court_ids.length || 1;
  const fixed = isFixedFormat(ctx.event.mabar_format);
  if (fixed ? teams.length < 2 : players.length < 4) {
    throw new Error(fixed ? "Minimal 2 pasangan yang sudah check-in." : "Minimal 4 pemain yang sudah check-in.");
  }
  if (fixed) {
    const members = new Map(teams.map((t) => [unitKey(t[0], ctx.event.mabar_format), t.map((p) => p.id)]));
    const plan = teamRoundRobin([...members.keys()], courts, seed);
    const { error } = await supabase.from("events").update({ rounds: plan.length }).eq("id", ctx.event.id);
    if (error) throw new Error(error.message);
    for (const [i, r] of plan.entries()) {
      await insertRound(supabase, ctx, i + 1, r.courts.map((c) => ({ a: members.get(c.a)!, b: members.get(c.b)! })), r.resting.flatMap((k) => members.get(k)!));
    }
  } else {
    const plan = americanoSchedule(players.map((p) => p.id), courts, seed);
    const { error } = await supabase.from("events").update({ rounds: plan.length }).eq("id", ctx.event.id);
    if (error) throw new Error(error.message);
    for (const [i, r] of plan.entries()) await insertRound(supabase, ctx, i + 1, r.courts.map((c) => ({ a: c.a, b: c.b })), r.resting);
  }
}

/** Mexicano / fixed Mexicano: the next round from the current table (round 1 is random). */
async function planNextMexicanoRound(supabase: Supa, ctx: Ctx) {
  const { players, teams } = schedulable(ctx);
  const fixed = isFixedFormat(ctx.event.mabar_format);
  if (fixed ? teams.length < 2 : players.length < 4) throw new Error(fixed ? "Minimal 2 pasangan yang sudah check-in." : "Minimal 4 pemain yang sudah check-in.");
  const table = mabarTable(ctx.participants, ctx.matches, ctx.event.mabar_format, ctx.event.draw_seed);
  // generateRound ranks by total_points: feed the table order (incl. its tiebreaks) as descending points
  const order = new Map(table.map((r, i) => [r.key, table.length - i]));
  const pool: Pool[] = (fixed ? teams.flat() : players).map((p) => ({
    id: p.id,
    team_no: p.team_no,
    total_points: ctx.matches.some(isScored) ? (order.get(unitKey(p, ctx.event.mabar_format)) ?? 0) : 0,
    sits_out_count: p.sits_out_count,
  }));
  const history = new Map<string, number>();
  const teamOf = new Map(ctx.participants.map((p) => [p.id, p.team_no]));
  for (const m of ctx.matches) {
    const keys = fixed
      ? [pairKey(String(teamOf.get(m.team_a_participant_ids[0])), String(teamOf.get(m.team_b_participant_ids[0])))]
      : [m.team_a_participant_ids, m.team_b_participant_ids].filter((s) => s.length === 2).map((s) => pairKey(s[0], s[1]));
    for (const k of keys) history.set(k, (history.get(k) ?? 0) + 1);
  }
  const { pairings, benchedIds } = generateRound(ctx.event.mabar_format!, pool, ctx.event.court_ids.length || 1, history);
  if (!pairings.length) throw new Error("Peserta belum cukup untuk satu court.");
  await insertRound(supabase, ctx, (ctx.rounds.at(-1)?.round_no ?? 0) + 1, pairings.map((p) => ({ a: p.team_a, b: p.team_b })), benchedIds);
}

async function markActive(supabase: Supa, ctx: Ctx) {
  await supabase.from("events").update({ status: "active" }).eq("id", ctx.event.id);
  await supabase.from("gen_events").update({ status: "active" }).eq("id", ctx.genId);
}

// ---------------------------------------------------------------- schedule actions

/** "Mulai": Americano → all rounds, Mexicano → round 1. Only checked-in players are scheduled. */
export async function startMabar(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const ctx = await loadMabar(supabase, str(fd, "event_id"));
    assertOpen(ctx);
    if (ctx.rounds.length) throw new Error("Jadwal sudah dibuat.");
    if (isAmericano(ctx)) await planWholeSchedule(supabase, ctx, Math.floor(Math.random() * 1_000_000));
    else await planNextMexicanoRound(supabase, ctx);
    await markActive(supabase, ctx);
    revalidateEvent(ctx.event.id);
  });
}

/** Americano: re-roll the whole schedule (e.g. after late check-ins). Locked once round 1 has started. */
export async function regenerateMabarSchedule(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const ctx = await loadMabar(supabase, str(fd, "event_id"));
    assertOpen(ctx);
    const started = ctx.matches.some(isScored) || Object.values(ctx.live).some((m) => m.status !== "scheduled" || m.team_a_games + m.team_b_games > 0);
    if (started) throw new Error("Ronde 1 sudah dimulai, jadwal terkunci.");
    await supabase.from("gen_rounds").delete().eq("event_id", ctx.genId); // gen_matches and their matches rows cascade
    await supabase.from("gen_participants").update({ sits_out_count: 0 }).eq("event_id", ctx.genId);
    const fresh = await loadMabar(supabase, ctx.event.id);
    await planWholeSchedule(supabase, fresh, Math.floor(Math.random() * 1_000_000));
    revalidateEvent(ctx.event.id);
  });
}

/** Mexicano: "Buat ronde berikutnya", only once every court of the current round is finished. */
export async function nextMabarRound(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const ctx = await loadMabar(supabase, str(fd, "event_id"));
    assertOpen(ctx);
    if (isAmericano(ctx)) throw new Error("Jadwal Americano sudah dibuat lengkap di awal.");
    const progress = mabarProgress(ctx.rounds, ctx.matches, ctx.event.rounds);
    if (progress.allPlanned) throw new Error(`Semua ${ctx.event.rounds} ronde sudah dibuat.`);
    if (progress.last && !progress.lastDone) throw new Error(`Selesaikan semua court di ronde ${progress.last.round_no} dulu.`);
    await planNextMexicanoRound(supabase, ctx);
    await markActive(supabase, ctx);
    revalidateEvent(ctx.event.id);
  });
}

// ---------------------------------------------------------------- scores

/** Write a court's result to both the round (gen_matches) and its live `matches` row. Ties are fine. */
async function writeCourtScore(supabase: Supa, ctx: Ctx, genMatchId: string, a: number, b: number) {
  assertOpen(ctx);
  if (!ctx.matches.some((m) => m.id === genMatchId)) throw new Error("Match tidak ditemukan");
  const ga = Math.max(0, Math.round(a));
  const gb = Math.max(0, Math.round(b));
  const { error } = await supabase.from("gen_matches").update({ team_a_points: ga, team_b_points: gb }).eq("id", genMatchId);
  if (error) throw new Error(error.message);
  await supabase
    .from("matches")
    .update({ team_a_games: ga, team_b_games: gb, status: "finished", is_live: false, timer_running: false, winner: ga === gb ? null : ga > gb ? "A" : "B" })
    .eq("gen_match_id", genMatchId);
  revalidateEvent(ctx.event.id);
}

/** Score typed on the event page (also corrections, until the event is closed). */
export async function saveMabarScore(eventId: string, genMatchId: string, a: number, b: number): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    await writeCourtScore(supabase, await loadMabar(supabase, eventId), genMatchId, a, b);
  });
}

/** "Selesaikan Match" from Live / Skor Cepat on a mabar court (`matchId` = the matches row). */
export async function finishMabarMatch(matchId: string, a: number, b: number): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const { data: m } = await supabase.from("matches").select("event_id, gen_match_id").eq("id", matchId).maybeSingle();
    if (!m?.event_id || !m.gen_match_id) throw new Error("Match mabar tidak ditemukan");
    await writeCourtScore(supabase, await loadMabar(supabase, m.event_id), m.gen_match_id, a, b);
  });
}

// ---------------------------------------------------------------- participants

/** Check-in on the day (or undo it). */
export async function setMabarCheckIn(eventId: string, participantId: string, checkedIn: boolean): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const ctx = await loadMabar(supabase, eventId);
    assertOpen(ctx);
    if (!ctx.participants.some((p) => p.id === participantId)) throw new Error("Peserta tidak ditemukan");
    const { error } = await supabase.from("gen_participants").update({ checked_in: checkedIn }).eq("id", participantId);
    if (error) throw new Error(error.message);
    revalidateEvent(eventId);
  });
}

/** A participant from a player id (`<field>`) or a guest name (`<field>_guest`). */
async function readPerson(supabase: Supa, fd: FormData, field: string) {
  const playerId = str(fd, field);
  if (playerId) {
    const { data } = await supabase.from("players").select("id, name").eq("id", playerId).maybeSingle();
    if (!data) throw new Error("Pemain tidak ditemukan");
    return { player_id: data.id, display_name: data.name };
  }
  const guest = str(fd, `${field}_guest`);
  if (!guest) throw new Error("Pilih pemain atau isi nama tamu.");
  return { player_id: null, display_name: guest };
}

function assertNotIn(ctx: Ctx, people: { player_id: string | null }[]) {
  const taken = new Set(ctx.participants.filter((p) => p.active && p.player_id).map((p) => p.player_id));
  const dup = people.find((p) => p.player_id && taken.has(p.player_id));
  if (dup) throw new Error("Pemain ini sudah terdaftar di event.");
}

/** Walk-in: a player (free formats) or a pair (fixed partner), checked in right away. */
export async function addMabarWalkIn(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const ctx = await loadMabar(supabase, str(fd, "event_id"));
    assertOpen(ctx);
    const fixed = isFixedFormat(ctx.event.mabar_format);
    const people = fixed ? [await readPerson(supabase, fd, "p1"), await readPerson(supabase, fd, "p2")] : [await readPerson(supabase, fd, "p1")];
    assertNotIn(ctx, people);
    const active = ctx.participants.filter((p) => p.active).length;
    if (ctx.event.quota && active + people.length > ctx.event.quota) throw new Error(`Kuota ${ctx.event.quota} pemain sudah penuh.`);
    if (fixed && people[0].player_id && people[0].player_id === people[1].player_id) throw new Error("Pilih dua pemain berbeda.");
    const teamNo = fixed ? Math.max(0, ...ctx.participants.map((p) => p.team_no ?? 0)) + 1 : null;
    const { error } = await supabase.from("gen_participants").insert(people.map((p) => ({ ...p, event_id: ctx.genId, team_no: teamNo, checked_in: true })));
    if (error) throw new Error(error.message);
    revalidateEvent(ctx.event.id);
  });
}

/** Remove a participant, only before the schedule exists. */
export async function removeMabarParticipant(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const ctx = await loadMabar(supabase, str(fd, "event_id"));
    if (ctx.rounds.length) throw new Error("Jadwal sudah dibuat. Pakai Ganti pemain.");
    const target = ctx.participants.find((p) => p.id === str(fd, "participant_id"));
    if (!target) throw new Error("Peserta tidak ditemukan");
    // a fixed pair goes as a whole
    const ids = target.team_no != null ? ctx.participants.filter((p) => p.team_no === target.team_no).map((p) => p.id) : [target.id];
    await supabase.from("gen_participants").delete().in("id", ids);
    revalidateEvent(ctx.event.id);
  });
}

/**
 * Substitute: the new player takes over every court that has not started yet (so from the next
 * round). The old player keeps the games already won and stays in the table.
 */
export async function substituteMabarPlayer(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const ctx = await loadMabar(supabase, str(fd, "event_id"));
    assertOpen(ctx);
    const old = ctx.participants.find((p) => p.id === str(fd, "participant_id") && p.active);
    if (!old) throw new Error("Peserta tidak ditemukan");
    const person = await readPerson(supabase, fd, "p1");
    assertNotIn(ctx, [person]);

    const { data: sub, error } = await supabase
      .from("gen_participants")
      .insert({ ...person, event_id: ctx.genId, team_no: old.team_no, checked_in: true, sits_out_count: old.sits_out_count })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("gen_participants").update({ active: false }).eq("id", old.id);

    const swap = (ids: string[]) => ids.map((id) => (id === old.id ? sub.id : id));
    const byId = new Map([...ctx.participants, sub].map((p) => [p.id, p]));
    const name = (ids: string[]) => ids.map((id) => byId.get(id)?.display_name ?? "?").join(" & ");
    const pids = (ids: string[]) => ids.map((id) => byId.get(id)?.player_id).filter((p): p is string => !!p);
    for (const g of ctx.matches) {
      const live = ctx.live[g.id];
      const notStarted = !isScored(g) && (!live || (live.status === "scheduled" && !live.is_live && live.team_a_games + live.team_b_games === 0));
      if (!notStarted || ![...g.team_a_participant_ids, ...g.team_b_participant_ids].includes(old.id)) continue;
      const a = swap(g.team_a_participant_ids);
      const b = swap(g.team_b_participant_ids);
      await supabase.from("gen_matches").update({ team_a_participant_ids: a, team_b_participant_ids: b }).eq("id", g.id);
      await supabase
        .from("matches")
        .update({ team_a_name: name(a), team_b_name: name(b), team_a_player_ids: pids(a), team_b_player_ids: pids(b) })
        .eq("gen_match_id", g.id);
    }
    revalidateEvent(ctx.event.id);
  });
}

// ---------------------------------------------------------------- finish

/** Lock the table, record places 1..n, and award leaderboard points by place (preset of the event). */
export async function finishMabar(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const ctx = await loadMabar(supabase, str(fd, "event_id"));
    assertOpen(ctx);
    if (!ctx.matches.some(isScored)) throw new Error("Belum ada match yang selesai.");
    if (Object.values(ctx.live).some((m) => m.is_live || (m.status !== "finished" && m.team_a_games + m.team_b_games > 0))) {
      throw new Error("Masih ada court yang sedang dimainkan. Selesaikan dulu.");
    }
    // rounds that never started are dropped (finishing early)
    const unplayed = ctx.rounds.filter((r) => !ctx.matches.some((m) => m.round_id === r.id && isScored(m))).map((r) => r.id);
    if (unplayed.length) await supabase.from("gen_rounds").delete().in("id", unplayed);
    const played = ctx.matches.filter((m) => !unplayed.includes(m.round_id));
    if (!played.every(isScored)) throw new Error("Masih ada court yang belum diisi skornya.");

    const { ranks, participant } = ctx.event.mabar_points;
    const awards = mabarTable(ctx.participants, played, ctx.event.mabar_format, ctx.event.draw_seed)
      .filter((r) => r.played > 0)
      .flatMap((r) =>
        r.unit.members
          .filter((m) => m.player_id)
          .map((m) => ({ event_id: ctx.event.id, player_id: m.player_id!, stage: "mabar" as const, rank: r.rank, points: ranks[r.rank - 1] ?? participant })),
      );
    if (awards.length) {
      const { error } = await supabase.from("player_awards").upsert(awards, { onConflict: "event_id,player_id", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    }
    await supabase.from("gen_events").update({ status: "finished" }).eq("id", ctx.genId);
    await supabase.from("events").update({ status: "finished" }).eq("id", ctx.event.id);
    revalidateEvent(ctx.event.id);
    revalidatePath("/leaderboard");
    revalidatePath("/leaderboard/[playerId]", "page");
  });
}
