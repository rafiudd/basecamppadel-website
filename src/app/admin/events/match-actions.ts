"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import {
  assignSlots,
  buildFirstRound,
  computeFinalStages,
  groupFixtures,
  planBracket,
  planFormat,
  type KoStage,
} from "@/lib/competition";
import { matchLabel, wibToIso, type CompetitionData } from "@/lib/compData";
import type { Match, Serve } from "@/lib/database.types";
import type { ActionState } from "@/lib/actionState";
import { assertEditableRoster, guard, int, load, revalidateEvent, str, type Supa } from "./_shared";

/** Kompetisi matches: scheduling, results, knockout bracket and finishing the event. Mulai / ON AIR: live-actions.ts. */

// ---------------------------------------------------------------- scheduling

function startIso(data: CompetitionData): number {
  const { event } = data;
  if (event.event_date && event.start_time) return new Date(wibToIso(event.event_date, event.start_time.slice(0, 5))).getTime();
  return Date.now();
}

/** Assign court + time to `items` in order, starting at `fromMs`. */
function scheduleRows<T extends { teams: string[]; after?: number[] }>(data: CompetitionData, items: T[], fromMs: number) {
  const courts = data.event.court_ids.length ? data.event.court_ids : [null];
  const dur = data.event.match_minutes * 60_000;
  return assignSlots(items, courts.length).map((s) => ({
    court_id: courts[s.court] ?? null,
    starts_at: new Date(fromMs + s.slot * dur).toISOString(),
    ends_at: new Date(fromMs + (s.slot + 1) * dur).toISOString(),
  }));
}

export async function generateGroupSchedule(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "event_id");
    const data = await load(supabase, id);
    assertEditableRoster(data);
    const { event, teams } = data;
    if (teams.some((t) => !t.group_label)) throw new Error("Semua tim harus masuk grup dulu (Acak grup atau pilih manual).");
    const labels = [...new Set(teams.map((t) => t.group_label!))].sort();
    const plan = planFormat({ teams: teams.length, groups: labels.length, advance: event.advance_per_group });
    if (plan.errors.length) {
      throw new Error(`${teams.length} tim terdaftar di ${labels.length} grup: ${plan.errors.join(" ")} Ubah format atau tambah tim di tab Format.`);
    }
    const sizes = labels.map((l) => teams.filter((t) => t.group_label === l).length);
    if (Math.max(...sizes) - Math.min(...sizes) > 1) throw new Error("Selisih jumlah tim antar grup maksimal 1.");

    const fixtures = groupFixtures(labels.map((label) => ({ label, teamIds: teams.filter((t) => t.group_label === label).map((t) => t.id) })));
    const slots = scheduleRows(data, fixtures.map((f) => ({ teams: [f.a, f.b] })), startIso(data));
    const team = (tid: string) => teams.find((t) => t.id === tid)!;
    const rows = fixtures.map((f, i) => ({
      ...baseRow(data),
      stage: "group" as const,
      group_label: f.group,
      round_no: f.round,
      set_label: `Grup ${f.group}`,
      ...side("a", team(f.a)),
      ...side("b", team(f.b)),
      ...slots[i],
    }));
    const { error } = await supabase.from("matches").insert(rows);
    if (error) throw new Error(error.message);
    await supabase.from("events").update({ status: "active", ko_start: plan.koStart ?? "final" }).eq("id", id);
    revalidateEvent(id);
  });
}

function baseRow(data: CompetitionData) {
  return {
    event_id: data.event.id,
    session_label: data.event.title,
    venue: data.venue?.name ?? "",
    status: "scheduled" as const,
  };
}

function side(s: "a" | "b", team: { id: string; name: string; players: { id: string }[] } | null) {
  return s === "a"
    ? { team_a_id: team?.id ?? null, team_a_name: team?.name ?? "TBD", team_a_player_ids: team?.players.map((p) => p.id) ?? [] }
    : { team_b_id: team?.id ?? null, team_b_name: team?.name ?? "TBD", team_b_player_ids: team?.players.map((p) => p.id) ?? [] };
}

/** Delete group schedule (only while no group match has a result). */
export async function clearGroupSchedule(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "event_id");
    const data = await load(supabase, id);
    if (data.matches.some((m) => m.status !== "scheduled")) throw new Error("Sudah ada match yang dimainkan, jadwal tidak bisa dihapus.");
    await supabase.from("matches").delete().eq("event_id", id);
    await supabase.from("events").update({ status: "draft", bracket_generated: false, bracket_stale: false }).eq("id", id);
    revalidateEvent(id);
  });
}

/** "Susun ulang otomatis": re-slot every unplayed match after the last played one. */
export async function rescheduleAuto(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "event_id");
    const data = await load(supabase, id);
    const dur = data.event.match_minutes * 60_000;
    const played = data.matches.filter((m) => !m.is_bye && m.status !== "scheduled" && m.starts_at);
    const from = Math.max(startIso(data), ...played.map((m) => new Date(m.starts_at!).getTime() + dur));
    const pending = data.matches
      .filter((m) => !m.is_bye && m.status === "scheduled")
      .sort((a, b) => stageRank(a) - stageRank(b) || (a.round_no ?? 0) - (b.round_no ?? 0) || (a.bracket_pos ?? 0) - (b.bracket_pos ?? 0));
    const index = new Map(pending.map((m, i) => [m.id, i]));
    const items = pending.map((m) => ({
      teams: [m.team_a_id, m.team_b_id].filter((t): t is string => !!t),
      after: pending.filter((p) => p.next_match_id === m.id).map((p) => index.get(p.id)!),
    }));
    const slots = scheduleRows(data, items, from);
    for (let i = 0; i < pending.length; i++) await supabase.from("matches").update(slots[i]).eq("id", pending[i].id);
    revalidateEvent(id);
  });
}

const STAGE_RANK: Record<string, number> = { group: 0, r16: 1, qf: 2, sf: 3, final: 4 };
const stageRank = (m: Match) => STAGE_RANK[m.stage ?? "group"] ?? 0;

export async function updateMatchSlot(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "event_id");
    const data = await load(supabase, id);
    const time = str(fd, "time");
    const date = data.event.event_date ?? new Date().toISOString().slice(0, 10);
    const starts = time ? wibToIso(date, time) : null;
    const { error } = await supabase
      .from("matches")
      .update({
        court_id: str(fd, "court_id") || null,
        starts_at: starts,
        ends_at: starts ? new Date(new Date(starts).getTime() + data.event.match_minutes * 60_000).toISOString() : null,
      })
      .eq("id", str(fd, "match_id"))
      .eq("event_id", id);
    if (error) throw new Error(error.message);
    revalidateEvent(id);
  });
}

// ---------------------------------------------------------------- results (Mulai / ON AIR: live-actions.ts)

/** Selesaikan Match (also used for corrections). `wo` = walkover winner side. */
export async function setCompResult(
  matchId: string,
  gamesA: number,
  gamesB: number,
  wo: Serve | null = null,
): Promise<ActionState> {
  return guard(() => applyResult(matchId, gamesA, gamesB, wo));
}

async function applyResult(matchId: string, gamesA: number, gamesB: number, wo: Serve | null) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("comp_set_result", { p_match_id: matchId, p_games_a: gamesA, p_games_b: gamesB, p_wo: wo });
  if (error) throw new Error(error.message);
  const { data: m } = await supabase.from("matches").select("event_id").eq("id", matchId).maybeSingle();
  if (m?.event_id) revalidateEvent(m.event_id);
  revalidatePath("/leaderboard");
}

/** "Edit skor" form on the Match tab. */
export async function correctScore(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const wo = str(fd, "wo");
    await applyResult(str(fd, "match_id"), int(fd, "games_a", 0), int(fd, "games_b", 0), wo === "A" || wo === "B" ? wo : null);
  });
}

// ---------------------------------------------------------------- bracket

async function writeBracket(supabase: Supa, data: CompetitionData, first: (string | null)[]) {
  const plans = planBracket(first);
  const ids = plans.map(() => crypto.randomUUID());
  const team = (tid: string | null) => data.teams.find((t) => t.id === tid) ?? null;

  const dur = data.event.match_minutes * 60_000;
  const lastGroup = Math.max(
    startIso(data) - dur,
    ...data.matches.filter((m) => m.stage === "group" && m.starts_at).map((m) => new Date(m.starts_at!).getTime()),
  );
  const playable = plans.map((p, i) => ({ p, i })).filter(({ p }) => !p.bye);
  const order = new Map(playable.map(({ i }, k) => [i, k]));
  const slots = scheduleRows(
    data,
    playable.map(({ p, i }) => ({
      teams: [p.a, p.b].filter((t): t is string => !!t),
      after: plans.map((q, j) => (q.next === i && !q.bye ? order.get(j)! : -1)).filter((k) => k >= 0),
    })),
    lastGroup + dur,
  );

  const rows = plans.map((p, i) => {
    const winner = p.bye ? (p.a ?? p.b) : null;
    return {
      id: ids[i],
      ...baseRow(data),
      stage: p.stage,
      bracket_pos: p.pos,
      set_label: matchLabel({ stage: p.stage, bracket_pos: p.pos, group_label: null } as Match),
      ...side("a", team(p.a)),
      ...side("b", team(p.b)),
      is_bye: p.bye,
      winner_team_id: winner,
      status: p.bye ? ("finished" as const) : ("scheduled" as const),
      next_match_id: p.next !== null ? ids[p.next] : null,
      next_slot: p.nextSlot,
      ...(p.bye ? {} : slots[order.get(i)!]),
    };
  });

  await supabase.from("matches").delete().eq("event_id", data.event.id).neq("stage", "group");
  // later rounds first so next_match_id always points at an existing row
  const { error } = await supabase.from("matches").insert(rows.reverse());
  if (error) throw new Error(error.message);
  await supabase.from("events").update({ bracket_generated: true, bracket_stale: false }).eq("id", data.event.id);
}

export async function generateBracket(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "event_id");
    const data = await load(supabase, id);
    if (!data.groupStageComplete) throw new Error("Semua match fase grup harus selesai dulu.");
    if (data.koStarted) throw new Error("Knockout sudah dimulai, bracket tidak bisa dibuat ulang.");
    const first = buildFirstRound(
      data.groups.map((g) => ({ label: g.label, ranked: g.standings })),
      data.event.advance_per_group,
    );
    await writeBracket(supabase, data, first);
    revalidateEvent(id);
  });
}

/** Swap two teams' first-round positions (before the knockout starts). */
export async function swapBracketTeams(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "event_id");
    const data = await load(supabase, id);
    if (data.koStarted) throw new Error("Knockout sudah dimulai, posisi tidak bisa ditukar.");
    const x = str(fd, "team_x");
    const y = str(fd, "team_y");
    if (!x || !y || x === y) throw new Error("Pilih dua tim yang berbeda.");
    const firstRound = data.ko[0]?.matches ?? [];
    const first = firstRound.flatMap((m) => [m.team_a_id, m.team_b_id]);
    const ix = first.indexOf(x);
    const iy = first.indexOf(y);
    if (ix < 0 || iy < 0) throw new Error("Tim tidak ada di babak pertama knockout.");
    [first[ix], first[iy]] = [first[iy], first[ix]];
    await writeBracket(supabase, data, first);
    revalidateEvent(id);
  });
}

// ---------------------------------------------------------------- finish event

export async function finishCompetition(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "event_id");
    const data = await load(supabase, id);
    const stages = computeFinalStages(
      data.teams.map((t) => t.id),
      data.ko.flatMap((r) =>
        r.matches.map((m) => ({
          stage: m.stage as KoStage,
          a: m.team_a_id,
          b: m.team_b_id,
          winner: m.winner_team_id,
          bye: m.is_bye,
          finished: m.status === "finished",
        })),
      ),
    );
    if (!stages) throw new Error("Final belum selesai.");
    const { error } = await supabase.rpc("comp_finish_event", {
      p_event_id: id,
      p_stages: Object.entries(stages).map(([team_id, stage]) => ({ team_id, stage })),
    });
    if (error) throw new Error(error.message);
    revalidateEvent(id);
    revalidatePath("/leaderboard");
    revalidatePath("/leaderboard/[playerId]", "page");
  });
}
