"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { groupLabel, planFormat, splitIntoGroups } from "@/lib/competition";
import type { CompEvent, GenFormat, ScoreMode } from "@/lib/database.types";
import type { ActionState } from "@/lib/actionState";
import { isAmericanoFormat, isFixedFormat, presetPoints } from "@/lib/events";
import { assertEditableRoster, friendly, guard, int, load, revalidateEvent, str, type Supa } from "./_shared";
import { resetMabarEvent } from "./mabar-actions";
import { resetCompetition } from "./match-actions";

/** Event lifecycle: create (wizard), edit, delete, and the team roster before the schedule exists. */

function slugify(s: string) {
  const base = s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${base || "event"}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Event detail fields present in the form (an edit form may send only some of them). */
function readDetails(fd: FormData) {
  const all = {
    title: () => str(fd, "title") || "Event",
    description: () => str(fd, "description"),
    event_date: () => str(fd, "event_date") || null,
    start_time: () => str(fd, "start_time") || null,
    venue_id: () => str(fd, "venue_id") || null,
    court_ids: () => fd.getAll("court_ids").map(String).filter(Boolean),
    price: () => str(fd, "price"),
    whatsapp_url: () => str(fd, "whatsapp_url") || null,
    match_minutes: () => Math.max(5, int(fd, "match_minutes", 20)),
    published: () => fd.getAll("published").includes("on"),
  };
  // an unchecked checkbox sends nothing, so forms mark these two with an empty hidden input
  return Object.fromEntries(
    Object.entries(all)
      .filter(([k]) => fd.has(k) || k === "title")
      .map(([k, read]) => [k, read()]),
  ) as Partial<{ [K in keyof typeof all]: ReturnType<(typeof all)[K]> }> & { title: string };
}

/** Points come from the chosen preset (copied onto the event so later preset edits don't change it). */
async function readPreset(supabase: Supa, fd: FormData) {
  const presetId = str(fd, "point_preset_id");
  const { data } = presetId
    ? await supabase.from("point_presets").select("id, rules").eq("id", presetId).maybeSingle()
    : { data: null };
  return { point_preset_id: data?.id ?? null, ...presetPoints(data?.rules ?? null) };
}

// ---------------------------------------------------------------- create / edit / delete

/** Wizard submit. Kompetisi: `teams` JSON [{ p1, p2, group }]. Mabar: `player_ids` (free formats) or `teams` (fixed partner). */
export async function createCompetition(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const eventId = str(fd, "event_type") === "mabar" ? await createMabar(supabase, fd) : await createKompetisi(supabase, fd);
    revalidateEvent(eventId);
    redirect(`/admin/events/${eventId}`);
  });
}

async function createKompetisi(supabase: Supa, fd: FormData) {
  const numTeams = int(fd, "num_teams", 6);
  const numGroups = int(fd, "num_groups", 2);
  const advance = int(fd, "advance_per_group", 2);
  const plan = planFormat({ teams: numTeams, groups: numGroups, advance });
  if (plan.errors.length) throw new Error(plan.errors.join(" "));

  const filled = readPairs(fd);
  if (filled.length > numTeams) throw new Error(`Jumlah tim (${filled.length}) melebihi format (${numTeams}).`);

  const details = readDetails(fd);
  const { data: event, error } = await supabase
    .from("events")
    .insert({
      ...details,
      ...(await readPreset(supabase, fd)),
      slug: slugify(details.title),
      type: "kompetisi",
      num_teams: numTeams,
      num_groups: numGroups,
      advance_per_group: advance,
      ko_start: plan.koStart ?? "final",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await insertTeams(supabase, event.id, filled);
  return event.id;
}

function readPairs(fd: FormData) {
  const teams = JSON.parse(str(fd, "teams") || "[]") as { p1: string; p2: string; group?: string | null }[];
  const filled = teams.filter((t) => t.p1 && t.p2);
  const ids = filled.flatMap((t) => [t.p1, t.p2]);
  if (new Set(ids).size !== ids.length) throw new Error("Satu pemain tidak boleh ada di dua tim.");
  return filled;
}

const MABAR_FORMATS: GenFormat[] = ["americano", "mexicano", "fixed_americano", "fixed_mexicano"];
const SCORE_MODES: ScoreMode[] = ["best_of", "race_to", "points"];

/** Mabar rounds run on the generator tables; the event links to its gen_event. Rounds are made on the event page after check-in. */
async function createMabar(supabase: Supa, fd: FormData) {
  const format = str(fd, "mabar_format") as GenFormat;
  if (!MABAR_FORMATS.includes(format)) throw new Error("Pilih format mabar.");
  const fixed = isFixedFormat(format);
  const pairs = fixed ? readPairs(fd) : [];
  const playerIds = fixed ? pairs.flatMap((t) => [t.p1, t.p2]) : [...new Set(fd.getAll("player_ids").map(String).filter(Boolean))];
  if (fixed && pairs.length < 2) throw new Error("Minimal 2 pasangan untuk format fixed partner.");
  if (!fixed && playerIds.length < 4) throw new Error("Minimal 4 pemain untuk mabar.");
  const quota = int(fd, "quota", 0);
  if (quota && quota < 4) throw new Error("Kuota minimal 4 pemain.");
  if (quota && playerIds.length > quota) throw new Error(`Peserta (${playerIds.length}) melebihi kuota (${quota}).`);

  const details = readDetails(fd);
  const { data: gen, error: genErr } = await supabase
    .from("gen_events")
    .insert({ title: details.title, format, court_ids: details.court_ids ?? [] })
    .select("id")
    .single();
  if (genErr) throw new Error(genErr.message);

  const { data: players } = await supabase.from("players").select("id, name").in("id", playerIds);
  const name = (id: string) => players?.find((p) => p.id === id)?.name ?? "?";
  const rows = fixed
    ? pairs.flatMap((t, i) => [t.p1, t.p2].map((pid) => ({ event_id: gen.id, player_id: pid, display_name: name(pid), team_no: i + 1 })))
    : playerIds.map((pid) => ({ event_id: gen.id, player_id: pid, display_name: name(pid) }));
  const { error: partErr } = await supabase.from("gen_participants").insert(rows);
  if (partErr) {
    await supabase.from("gen_events").delete().eq("id", gen.id);
    throw new Error(partErr.message);
  }

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      ...details,
      ...(await readPreset(supabase, fd)),
      slug: slugify(details.title),
      type: "mabar",
      mabar_format: format,
      // Americano/fixed-americano: a real round count only makes sense once people check in — the
      // schedule generator (planWholeSchedule) computes and overwrites this for real. Mexicano/fixed
      // mexicano has no natural "complete" round count (pairing is standings-based), so there the
      // admin's number is the actual cap used.
      rounds: isAmericanoFormat(format) ? 1 : Math.max(1, int(fd, "rounds", 7)),
      gen_event_id: gen.id,
      quota: quota || null,
      score_mode: SCORE_MODES.includes(str(fd, "score_mode") as ScoreMode) ? (str(fd, "score_mode") as ScoreMode) : "points",
      points_target: Math.max(1, int(fd, "points_target", 24)),
    })
    .select("id")
    .single();
  if (error) {
    await supabase.from("gen_events").delete().eq("id", gen.id);
    throw new Error(error.message);
  }
  return event.id;
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

/** `stream_url:<courtId>` inputs (edit-event modal only) -> { [courtId]: url }, empty ones included. */
function readCourtStreamUrls(fd: FormData) {
  const map = new Map<string, string>();
  for (const key of fd.keys()) {
    if (key.startsWith("stream_url:")) map.set(key.slice("stream_url:".length), str(fd, key));
  }
  return map;
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
    const courtStreamUrls = readCourtStreamUrls(fd);
    if (courtStreamUrls.size) {
      patch.court_stream_urls = Object.fromEntries([...courtStreamUrls].filter(([, url]) => url));
    }
    const { error } = await supabase.from("events").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    // Already-generated matches on these courts (past rounds, existing bracket) pick up the new
    // link too, not just future ones — a link change should apply retroactively, same event.
    for (const [courtId, url] of courtStreamUrls) {
      await supabase.from("matches").update({ stream_url: url || null }).eq("event_id", id).eq("court_id", courtId);
    }
    revalidateEvent(id);
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
    const { data: ev } = await supabase.from("events").select("gen_event_id").eq("id", id).maybeSingle();
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) throw new Error(error.message);
    if (ev?.gen_event_id) await supabase.from("gen_events").delete().eq("id", ev.gen_event_id);
    revalidateEvent(id);
    redirect("/admin/events");
  });
}

/** One button for both event types: dispatches to the mabar or kompetisi reset by the event's own type. */
export async function resetEvent(state: ActionState, fd: FormData): Promise<ActionState> {
  let type: string | null = null;
  const err = await guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "event_id");
    const { data: event } = await supabase.from("events").select("type").eq("id", id).maybeSingle();
    if (!event) throw new Error("Event tidak ditemukan");
    type = event.type;
  });
  if (err) return err;
  return type === "mabar" ? resetMabarEvent(state, fd) : resetCompetition(state, fd);
}

// ---------------------------------------------------------------- teams & groups

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
