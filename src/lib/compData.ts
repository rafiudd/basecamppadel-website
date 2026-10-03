import type { createClient } from "@/lib/supabase/server";
import { courtLabel } from "@/lib/format";
import {
  computeStandings,
  findConflicts,
  KO_ORDER,
  type Conflict,
  type KoStage,
  type ResultMatch,
  type StandingRow,
} from "@/lib/competition";
import type { CompEvent, CompTeam, Court, Match, Player, Venue } from "@/lib/database.types";

type Supa = Awaited<ReturnType<typeof createClient>>;

export type TeamWithPlayers = CompTeam & { players: Pick<Player, "id" | "name">[] };

export type GroupView = {
  label: string;
  teams: TeamWithPlayers[];
  standings: StandingRow[];
  matches: Match[];
  complete: boolean;
};

export type CompetitionData = {
  event: CompEvent;
  venue: Venue | null;
  courts: Court[];
  teams: TeamWithPlayers[];
  matches: Match[];
  groups: GroupView[];
  ko: { stage: KoStage; matches: Match[] }[];
  groupStageComplete: boolean;
  koStarted: boolean;
  conflicts: Conflict[];
};

// plain helpers instead of closures on CompetitionData, so the data can be passed to client components
export const teamNameOf = (teams: { id: string; name: string }[], id: string | null) => teams.find((t) => t.id === id)?.name ?? "—";
export const courtNameOf = (courts: { id: string; name: string }[], id: string | null) => {
  const c = courts.find((x) => x.id === id);
  return c ? courtLabel(c.name) : "—";
};

export const toResult = (m: Match): ResultMatch => ({
  a: m.team_a_id ?? "",
  b: m.team_b_id ?? "",
  ga: m.team_a_games,
  gb: m.team_b_games,
  winner: m.winner_team_id,
  wo: m.is_wo,
  finished: m.status === "finished",
});

/** "2026-10-30" + "18:00" (WIB wall time) -> UTC ISO. */
export function wibToIso(date: string, time: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, hh - 7, mm || 0)).toISOString();
}

/** UTC ISO -> "HH:MM" WIB, for <input type="time">. */
export function isoToWibTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 7 * 3600_000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export async function loadCompetition(supabase: Supa, by: { id?: string; slug?: string }): Promise<CompetitionData | null> {
  let q = supabase.from("events").select("*");
  q = by.id ? q.eq("id", by.id) : q.eq("slug", by.slug ?? "");
  const { data: event } = await q.maybeSingle();
  if (!event) return null;

  const [{ data: teams }, { data: links }, { data: matches }, { data: courts }, { data: venue }] = await Promise.all([
    supabase.from("comp_teams").select("*").eq("event_id", event.id).order("created_at"),
    supabase.from("comp_team_players").select("*").eq("event_id", event.id).order("slot"),
    supabase.from("matches").select("*").eq("event_id", event.id).order("starts_at", { nullsFirst: false }).order("bracket_pos").order("created_at"),
    supabase.from("courts").select("*").order("name"),
    event.venue_id
      ? supabase.from("venues").select("*").eq("id", event.venue_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const playerIds = [...new Set((links ?? []).map((l) => l.player_id))];
  const { data: players } = playerIds.length
    ? await supabase.from("players").select("id, name").in("id", playerIds)
    : { data: [] as Pick<Player, "id" | "name">[] };

  const teamList: TeamWithPlayers[] = (teams ?? []).map((t) => ({
    ...t,
    players: (links ?? [])
      .filter((l) => l.team_id === t.id)
      .map((l) => (players ?? []).find((p) => p.id === l.player_id))
      .filter((p): p is Pick<Player, "id" | "name"> => !!p),
  }));
  const matchList = matches ?? [];
  const courtList = courts ?? [];

  const labels = [...new Set(teamList.map((t) => t.group_label).filter((l): l is string => !!l))].sort();
  const groups: GroupView[] = labels.map((label) => {
    const gTeams = teamList.filter((t) => t.group_label === label);
    const gMatches = matchList.filter((m) => m.stage === "group" && m.group_label === label);
    return {
      label,
      teams: gTeams,
      matches: gMatches,
      standings: computeStandings(gTeams.map((t) => t.id), gMatches.map(toResult), event.draw_seed),
      complete: gMatches.length > 0 && gMatches.every((m) => m.status === "finished"),
    };
  });

  const koMatches = matchList.filter((m) => m.stage && m.stage !== "group");
  const ko = KO_ORDER.map((stage) => ({
    stage,
    matches: koMatches.filter((m) => m.stage === stage).sort((a, b) => (a.bracket_pos ?? 0) - (b.bracket_pos ?? 0)),
  })).filter((r) => r.matches.length > 0);

  const timed = matchList
    .filter((m) => !m.is_bye && m.status !== "finished")
    .map((m) => ({
      id: m.id,
      court_id: m.court_id,
      starts_at: m.starts_at,
      teams: [m.team_a_id, m.team_b_id].filter((t): t is string => !!t),
    }));

  return {
    event,
    venue: venue ?? null,
    courts: courtList,
    teams: teamList,
    matches: matchList,
    groups,
    ko,
    groupStageComplete: groups.length > 0 && groups.every((g) => g.complete),
    koStarted: koMatches.some((m) => !m.is_bye && (m.status !== "scheduled" || m.team_a_games + m.team_b_games > 0)),
    conflicts: findConflicts(timed, event.match_minutes),
  };
}

export function matchLabel(m: Match): string {
  if (m.stage === "group") return `Grup ${m.group_label ?? ""}`;
  const names: Record<string, string> = { r16: "16 besar", qf: "8 besar", sf: "Semifinal", final: "Final" };
  const short: Record<string, string> = { r16: "R16", qf: "QF", sf: "SF", final: "" };
  const s = m.stage ?? "";
  return s === "final" ? "Final" : `${names[s] ?? ""} · ${short[s] ?? ""}${m.bracket_pos ?? ""}`;
}
