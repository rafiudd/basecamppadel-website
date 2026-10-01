"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import {
  assignSlots,
  buildFirstRound,
  computeFinalStages,
  groupFixtures,
  groupLabel,
  planBracket,
  planFormat,
  splitIntoGroups,
  type KoStage,
} from "@/lib/competition";
import { loadCompetition, matchLabel, wibToIso, type CompetitionData } from "@/lib/compData";
import type { CompEvent, EventPoints, Match, Serve } from "@/lib/database.types";

type Supa = Awaited<ReturnType<typeof createClient>>;
export type ActionState = { error?: string } | null;

/** Expected errors are returned (Next hides thrown messages in production); redirects pass through. */
async function guard(fn: () => Promise<void>): Promise<ActionState> {
  try {
    await fn();
    return null;
  } catch (e) {
    unstable_rethrow(e);
    return { error: e instanceof Error ? friendly(e.message) : String(e) };
  }
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const int = (fd: FormData, k: string, def: number) => {
  const v = Number(str(fd, k));
  return Number.isFinite(v) && str(fd, k) !== "" ? Math.round(v) : def;
};

const POINT_KEYS: (keyof EventPoints)[] = ["champion", "runner_up", "sf", "qf", "r16", "group"];

function slugify(s: string) {
  const base = s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${base || "event"}-${Math.random().toString(36).slice(2, 6)}`;
}

function revalidateEvent(id: string) {
  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/admin/events");
  revalidatePath("/admin/live");
  revalidatePath("/jadwal");
  revalidatePath("/jadwal/[slug]", "page");
}

async function load(supabase: Supa, id: string): Promise<CompetitionData> {
  const data = await loadCompetition(supabase, { id });
  if (!data) throw new Error("Event tidak ditemukan");
  return data;
}

function friendly(message: string) {
  if (message.includes("comp_team_players_event_id_player_id_key")) return "Pemain ini sudah ada di tim lain pada event ini.";
  return message;
}

function readDetails(fd: FormData) {
  const points = Object.fromEntries(POINT_KEYS.map((k) => [k, int(fd, `points_${k}`, 0)])) as EventPoints;
  return {
    title: str(fd, "title") || "Kompetisi",
    description: str(fd, "description"),
    event_date: str(fd, "event_date") || null,
    start_time: str(fd, "start_time") || null,
    venue_id: str(fd, "venue_id") || null,
    court_ids: fd.getAll("court_ids").map(String).filter(Boolean),
    price: str(fd, "price"),
    whatsapp_url: str(fd, "whatsapp_url") || null,
    match_minutes: Math.max(5, int(fd, "match_minutes", 20)),
    points,
    published: fd.get("published") === "on",
  };
}

// ---------------------------------------------------------------- create / edit / delete

/** Wizard submit. `teams` is JSON: [{ p1, p2, group }] (group optional). */
export async function createCompetition(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();

    const eventType = str(fd, "event_type") === "mabar" ? "mabar" : "kompetisi";
    const numTeams = int(fd, "num_teams", 6);
    const numGroups = int(fd, "num_groups", 2);
    const advance = int(fd, "advance_per_group", 2);
    const plan = planFormat({ teams: numTeams, groups: numGroups, advance });
    if (plan.errors.length) throw new Error(plan.errors.join(" "));

    const teams = JSON.parse(str(fd, "teams") || "[]") as { p1: string; p2: string; group?: string | null }[];
    const filled = teams.filter((t) => t.p1 && t.p2);
    const ids = filled.flatMap((t) => [t.p1, t.p2]);
    if (new Set(ids).size !== ids.length) throw new Error("Satu pemain tidak boleh ada di dua tim.");
    if (filled.length > numTeams) throw new Error(`Jumlah tim (${filled.length}) melebihi format (${numTeams}).`);

    const details = readDetails(fd);
    const { data: event, error } = await supabase
      .from("events")
      .insert({
        ...details,
        slug: slugify(details.title),
        type: eventType,
        num_teams: numTeams,
        num_groups: numGroups,
        advance_per_group: advance,
        ko_start: plan.koStart ?? "final",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await insertTeams(supabase, event.id, filled);
    revalidateEvent(event.id);
    redirect(`/admin/events/${event.id}`);
  });
}

async function insertTeams(supabase: Supa, eventId: string, teams: { p1: string; p2: string; group?: string | null }[]) {
  if (!teams.length) return;
  const { data: players } = await supabase.from("players").select("id, name").in("id", teams.flatMap((t) => [t.p1, t.p2]));
  const name = (id: string) => players?.find((p) => p.id === id)?.name ?? "?";
  for (const t of teams) {
    const { data: team, error } = await supabase
      .from("comp_teams")
      .insert({ event_id: eventId, name: `${name(t.p1)} / ${name(t.p2)}`, group_label: t.group || null })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { error: linkErr } = await supabase.from("comp_team_players").insert([
      { team_id: team.id, event_id: eventId, player_id: t.p1, slot: 1 },
      { team_id: team.id, event_id: eventId, player_id: t.p2, slot: 2 },
    ]);
    if (linkErr) {
      await supabase.from("comp_teams").delete().eq("id", team.id);
      throw new Error(friendly(linkErr.message));
    }
  }
}

export async function updateCompetition(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "event_id");
    const data = await load(supabase, id);
    const patch: Partial<CompEvent> = readDetails(fd) as Partial<CompEvent>;
    if (data.event.status === "draft" && !data.matches.length) {
      const numTeams = int(fd, "num_teams", data.event.num_teams);
      const numGroups = int(fd, "num_groups", data.event.num_groups);
      const advance = int(fd, "advance_per_group", data.event.advance_per_group);
      const plan = planFormat({ teams: numTeams, groups: numGroups, advance });
      if (plan.errors.length) throw new Error(plan.errors.join(" "));
      Object.assign(patch, { num_teams: numTeams, num_groups: numGroups, advance_per_group: advance, ko_start: plan.koStart ?? "final" });
    }
    const { error } = await supabase.from("events").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    revalidateEvent(id);
    redirect(`/admin/events/${id}`);
  });
}

export async function deleteCompetition(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "event_id");
    const { data: ms } = await supabase.from("matches").select("id").eq("event_id", id);
    const matchIds = (ms ?? []).map((m) => m.id);
    // history rows would otherwise survive as orphans (match_id set null) and keep counting in W-L
    if (matchIds.length) await supabase.from("match_history").delete().in("match_id", matchIds);
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidateEvent(id);
    redirect("/admin/events");
  });
}

// ---------------------------------------------------------------- teams & groups

function assertEditableRoster(data: CompetitionData) {
  if (data.matches.length) throw new Error("Jadwal sudah dibuat. Hapus jadwal dulu untuk mengubah tim atau grup.");
}

export async function addTeam(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "event_id");
    const data = await load(supabase, id);
    assertEditableRoster(data);
    const p1 = str(fd, "p1");
    const p2 = str(fd, "p2");
    if (!p1 || !p2 || p1 === p2) throw new Error("Pilih dua pemain yang berbeda.");
    if (data.teams.length >= data.event.num_teams) throw new Error(`Format hanya untuk ${data.event.num_teams} tim.`);
    await insertTeams(supabase, id, [{ p1, p2 }]);
    revalidateEvent(id);
  });
}

export async function removeTeam(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "event_id");
    assertEditableRoster(await load(supabase, id));
    const { error } = await supabase.from("comp_teams").delete().eq("id", str(fd, "team_id")).eq("event_id", id);
    if (error) throw new Error(error.message);
    revalidateEvent(id);
  });
}

export async function shuffleGroups(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "event_id");
    const data = await load(supabase, id);
    assertEditableRoster(data);
    const groups = splitIntoGroups(data.teams.map((t) => t.id), data.event.num_groups);
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].length) await supabase.from("comp_teams").update({ group_label: groupLabel(i) }).in("id", groups[i]);
    }
    revalidateEvent(id);
  });
}

/** Manual move: form fields `group_<teamId>` = label. */
export async function saveGroups(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "event_id");
    const data = await load(supabase, id);
    assertEditableRoster(data);
    for (const t of data.teams) {
      const label = str(fd, `group_${t.id}`) || null;
      if (label !== t.group_label) await supabase.from("comp_teams").update({ group_label: label }).eq("id", t.id);
    }
    revalidateEvent(id);
  });
}

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
    if (plan.errors.length) throw new Error(plan.errors.join(" "));
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

// ---------------------------------------------------------------- live & results

/** "Live-kan": put this match ON AIR (only one ON AIR match per event). */
export async function goLive(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "event_id");
    const matchId = str(fd, "match_id");
    await supabase.from("matches").update({ is_live: false }).eq("event_id", id).neq("id", matchId);
    const { error } = await supabase.from("matches").update({ is_live: true, status: "live" }).eq("id", matchId).neq("status", "finished");
    if (error) throw new Error(error.message);
    revalidateEvent(id);
    if (fd.get("open") === "1") redirect(`/admin/live?match=${matchId}`);
  });
}

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
