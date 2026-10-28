import { cache } from "react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { MABAR_FORMAT_LABEL, scoreModeBox } from "./eventFormats";
import eventsData from "@/data/events.json";
import matchesData from "@/data/event-matches.json";
import { STAGE_LABEL, type KoStage } from "@/lib/competition";
import { addHoursHHMM, courtLabel, eventDurationHours, eventPrice, parseDateParts } from "@/lib/format";
import { WHATSAPP_URL, YOUTUBE_URL } from "@/lib/config";
import type {
  CompEvent,
  Court,
  Database,
  EventPoints,
  GenFormat,
  GenParticipant,
  MabarPoints,
  Match,
  PointCategoryItem,
  PointPresetRules,
  ScoreMode,
  Venue,
} from "@/lib/database.types";
import { loadCompetition, teamNameOf, courtNameOf, matchLabel, isoToWibTime, type CompetitionData } from "@/lib/compData";
import { loadMabarRounds, mabarTable, unitKey, unitSchedule, type UnitMatchRow } from "@/lib/mabar";

export interface EventItem {
  id: string;
  slug: string;
  day: string;
  date: string;
  month: string;
  year: string;
  dateFormatted: string;
  type: "mabar" | "kompetisi";
  status: "live" | "open" | "finished";
  statusLabel?: string;
  title: string;
  subtitle: string;
  venue: string;
  court: string;
  venueFormatted: string;
  time: string;
  price: string;
  slots: string;
  slotsPercent?: number;
  deadline?: string;
  aboutText: string;
  formatBoxes: { val: string; label: string }[];
  availableTabs: Array<"info" | "match" | "klasemen" | "playoff" | "livestream">;
  defaultTab: "info" | "match" | "klasemen" | "playoff";
  /** Courts with a YouTube link configured (edit-event "Link YouTube per court") — drives the public Livestream tab. */
  courtStreams?: Array<{ courtId: string; courtName: string; url: string }>;
  liveScore?: {
    title: string;
    servingTeam: number;
    team1: { name: string; sets: number[]; game: number };
    team2: { name: string; sets: number[]; game: number };
    streamUrl: string;
  };
  podium?: Array<{ rank: number; label: string; name: string; points?: number; players?: Array<{ id: string; name: string }> }>;
  /** Kompetisi only: this event's own leaderboard point rules (the "Poin" tab / point preset). */
  pointsRules?: EventPoints;
  registeredParticipants?: Array<{ id: string; name: string; level: string; avatar: string }>;
  registeredTeams?: Array<{ id: string; name: string; avatar: string }>;
  whatsapp_url?: string | null;
  league_id?: string | null;
  league_name?: string | null;
  league_slug?: string | null;
}

export interface KnockoutMatch {
  round: string;
  court: string;
  status: "live" | "next" | "waiting" | "finished";
  team1: { id?: string; name: string; score: string; winner?: boolean };
  team2: { id?: string; name: string; score: string; winner?: boolean };
  streamUrl?: string;
}

export interface GroupMatch {
  group: string;
  round: number;
  court: string;
  status: "live" | "next" | "waiting" | "finished";
  team1: { id?: string; name: string; score: string; winner?: boolean };
  team2: { id?: string; name: string; score: string; winner?: boolean };
}

/** One match in a kompetisi team's own history — "lihat jadwal" popup, same idea as a mabar pair's UnitMatchRow. */
export interface TeamMatchRow {
  label: string;
  opponent: string;
  mine: number | null;
  theirs: number | null;
  result: "W" | "L" | null;
}

export interface GroupRow {
  rank: number;
  team: string;
  points: number;
  wl: string;
  diff: string;
  qualified?: string;
  /** Mabar only: unit key into `EventMatchesData.unitSchedules`, for "lihat jadwal lawan". */
  key?: string;
}

export interface GroupData {
  name: string;
  rows: GroupRow[];
}

export interface EventMatchesData {
  liveMatch?: {
    court: string;
    time: string;
    round: string;
    team1: { name: string; score: number; serving: boolean; game: number };
    team2: { name: string; score: number; serving: boolean; game: number };
    streamUrl: string;
  };
  knockout?: KnockoutMatch[];
  quarterfinals?: KnockoutMatch[];
  groupMatches?: GroupMatch[];
  groups?: GroupData[];
  rounds?: Array<{ round: string; time: string; status: string; p1: string; p2: string; s1: number; s2: number; p1Key?: string; p2Key?: string }>;
  roundsDone?: number;
  roundsTotal?: number;
  /** Mabar only: every pair/player's full match history, keyed the same as `GroupRow.key` — for a "lihat jadwal lawan" popup. */
  unitSchedules?: Record<string, { name: string; rows: UnitMatchRow[] }>;
  /** Kompetisi only: every team's full match history (group + knockout), keyed by team id — same "lihat jadwal" popup idea as unitSchedules. */
  teamSchedules?: Record<string, { name: string; rows: TeamMatchRow[] }>;
}

/** Get client suitable for current runtime. */
function getPublicClient(): any {
  if (typeof window !== "undefined") {
    return createBrowserClient();
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MongoClientAdapter } = require("@/lib/server/mongoAdapter");
  return new MongoClientAdapter();
}

function formatCourtRange(names: string[]): string {
  const uniqueNames = [...new Set(names.filter(Boolean))];
  if (!uniqueNames.length) return "Court 1";
  const nums = [
    ...new Set(
      uniqueNames
        .map((n) => Number(n.replace(/\D/g, "")))
        .filter((n) => Number.isFinite(n) && n > 0),
    ),
  ].sort((a, b) => a - b);
  if (nums.length > 1 && nums[nums.length - 1] - nums[0] === nums.length - 1) {
    return `Court ${nums[0]}–${nums[nums.length - 1]}`;
  }
  return uniqueNames.map(courtLabel).join(", ") || "Court 1";
}

function formatTimeRangeStr(startHHMM: string, hours: number): string {
  return `${startHHMM}–${addHoursHHMM(startHHMM, hours)} WIB`;
}

export async function getEvents(): Promise<EventItem[]> {
  try {
    const supabase = getPublicClient();
    const { data: dbEvents, error } = await supabase
      .from("events")
      .select("*")
      .eq("published", true)
      .order("event_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (!error && dbEvents && dbEvents.length > 0) {
      const [{ data: venues }, { data: courts }, { data: liveMatches }, { data: teams }, { data: participants }] = await Promise.all([
        supabase.from("venues").select("id, name"),
        supabase.from("courts").select("id, name"),
        supabase.from("matches").select("id, event_id, is_live").eq("is_live", true),
        supabase.from("comp_teams").select("id, event_id"),
        supabase.from("gen_participants").select("id, event_id").eq("active", true),
      ]);

      const venueMap = new Map((venues ?? []).map((v: any) => [v.id, v.name]));
      const courtMap = new Map((courts ?? []).map((c: any) => [c.id, c.name]));
      const liveEventIds = new Set((liveMatches ?? []).map((m: any) => m.event_id).filter(Boolean));

      const items: EventItem[] = dbEvents.map((e: any) => {
        const isLive = liveEventIds.has(e.id) || e.status === "active";
        const isFinished = e.status === "finished";
        const status = isFinished ? "finished" : isLive ? "live" : "open";

        const dateParts = e.event_date
          ? parseDateParts(e.event_date)
          : parseDateParts(e.created_at.slice(0, 10));

        const venueName = (e.venue_id && venueMap.get(e.venue_id)) || "East Padel House";
        const courtNames = e.court_ids && e.court_ids.length > 0
          ? formatCourtRange(e.court_ids.map((id: string) => courtMap.get(id)).filter(Boolean) as string[])
          : "Court 1";

        const teamCount = (teams ?? []).filter((t: any) => t.event_id === e.id).length;
        const partCount = e.gen_event_id
          ? (participants ?? []).filter((p: any) => p.event_id === e.gen_event_id).length
          : 0;

        const totalSlots = e.type === "kompetisi"
          ? e.num_teams
          : e.quota || (e.court_ids.length ? e.court_ids.length * 4 : 8);
        const currentSlots = e.type === "kompetisi" ? teamCount : partCount;
        const slotsPercent = Math.min(100, Math.round((currentSlots / (totalSlots || 1)) * 100));
        const slots = e.type === "kompetisi"
          ? `${currentSlots}/${totalSlots} tim`
          : `${currentSlots}/${totalSlots} pemain`;

        const koLabel = e.ko_start ? (STAGE_LABEL[e.ko_start as KoStage]?.toLowerCase() || "knockout") : "knockout";
        const subtitle = e.type === "kompetisi"
          ? `Fase grup + ${koLabel} · ${totalSlots} tim`
          : `${e.mabar_format ? MABAR_FORMAT_LABEL[e.mabar_format as GenFormat] : "Americano"} · semua level`;

        const startTimeStr = e.start_time ? e.start_time.slice(0, 5) : "18:00";
        const time = formatTimeRangeStr(startTimeStr, eventDurationHours(e));

        return {
          id: e.id,
          slug: e.slug,
          day: dateParts.day,
          date: dateParts.date,
          month: dateParts.month,
          year: dateParts.year,
          dateFormatted: dateParts.dateFormatted,
          type: e.type,
          status,
          statusLabel: status === "live" ? "Berlangsung" : status === "finished" ? "Selesai" : "Pendaftaran dibuka",
          title: e.title,
          subtitle,
          venue: venueName,
          court: courtNames,
          venueFormatted: `${venueName} · ${courtNames}`,
          time,
          price: eventPrice(e),
          slots,
          slotsPercent,
          aboutText: e.description || (e.type === "kompetisi"
            ? "Kompetisi pasangan tetap. Tim dibagi ke grup dan main round robin, lalu tim teratas lolos ke babak gugur sampai final. Skor diperbarui langsung dari court."
            : "Mabar rutin komunitas. Setiap pemain mengumpulkan poin dan berganti pasangan sesuai format. Skor diperbarui langsung dari court."),
          formatBoxes: e.type === "kompetisi"
            ? [
                { val: String(e.num_groups), label: "Grup" },
                { val: `Top ${e.advance_per_group}`, label: "Lolos per grup" },
                { val: e.ko_start ? (STAGE_LABEL[e.ko_start as KoStage] || "8 besar") : "8 besar", label: "Knockout mulai" },
                { val: "1 set", label: "Per match" },
              ]
            : [
                { val: String(totalSlots), label: "Pemain" },
                { val: e.mabar_format ? MABAR_FORMAT_LABEL[e.mabar_format as GenFormat] : "Americano", label: "Format" },
                { val: String(e.rounds || 7), label: "Ronde main" },
                scoreModeBox(e.score_mode || "points", e.points_target || 24),
              ],
          availableTabs: e.type === "kompetisi"
            ? ["info", "match", "klasemen", "playoff"]
            : ["info", "match", "klasemen"],
          defaultTab: status === "live" ? "match" : status === "finished" ? "klasemen" : "info",
          whatsapp_url: e.whatsapp_url,
        };
      });

      return items;
    }
  } catch (err) {
    console.error("Failed to fetch events from Supabase:", err);
  }

  return eventsData.events as EventItem[];
}

export async function getUpcomingEvents(): Promise<EventItem[]> {
  const events = await getEvents();
  return events.filter((e) => e.status === "live" || e.status === "open");
}

export async function getPastEvents(): Promise<EventItem[]> {
  const events = await getEvents();
  return events.filter((e) => e.status === "finished");
}

export const getEventByIdOrSlug = cache(async (idOrSlug: string): Promise<EventItem | null> => {
  try {
    const supabase = getPublicClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    let q = supabase.from("events").select("*");
    q = isUuid ? q.or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`) : q.eq("slug", idOrSlug);
    const { data: event } = await q.maybeSingle();

    if (event) {
      if (event.type === "kompetisi") {
        const data = await loadCompetition(supabase as any, { id: event.id });
        if (data) {
          return mapCompetitionToEventItem(data);
        }
      } else {
        return await mapMabarToEventItem(supabase, event);
      }
    }
  } catch (err) {
    console.error("Failed to fetch event by id/slug from Supabase:", err);
  }

  // Fallback to mock data if not found in database
  const events = eventsData.events as EventItem[];
  const found = events.find((e) => e.id === idOrSlug || e.slug === idOrSlug);
  return found || null;
});

function mapCompetitionToEventItem(data: CompetitionData): EventItem {
  const { event, venue, courts, teams, matches } = data;
  const isLive = matches.some((m) => m.is_live) || event.status === "active";
  const isFinished = event.status === "finished";
  const status: "live" | "open" | "finished" = isFinished ? "finished" : isLive ? "live" : "open";

  const dateParts = event.event_date
    ? parseDateParts(event.event_date)
    : parseDateParts(event.created_at.slice(0, 10));

  const venueName = venue?.name || "East Padel House";
  const eventCourts = event.court_ids && event.court_ids.length > 0
    ? courts.filter((c) => event.court_ids.includes(c.id))
    : event.venue_id
    ? courts.filter((c) => c.venue_id === event.venue_id)
    : courts;
  const courtNames = eventCourts.length > 0 ? formatCourtRange(eventCourts.map((c) => c.name)) : "Court 1";

  const currentSlots = teams.length;
  const totalSlots = event.num_teams || 8;
  const slotsPercent = Math.min(100, Math.round((currentSlots / totalSlots) * 100));

  const startTimeStr = event.start_time ? event.start_time.slice(0, 5) : "18:00";
  const time = formatTimeRangeStr(startTimeStr, eventDurationHours(event));

  let liveScore: EventItem["liveScore"] | undefined;
  const liveM = matches.find((m) => m.is_live);
  if (liveM) {
    const t1Name = teamNameOf(teams, liveM.team_a_id);
    const t2Name = teamNameOf(teams, liveM.team_b_id);
    liveScore = {
      title: `LIVE · ${matchLabel(liveM).toUpperCase()} · ${courtNameOf(courts, liveM.court_id).toUpperCase()}`,
      servingTeam: liveM.serve === "B" ? 2 : 1,
      team1: {
        name: t1Name,
        sets: liveM.team_a_sets?.length ? liveM.team_a_sets : [liveM.team_a_games],
        game: Number(liveM.team_a_game) || liveM.team_a_games,
      },
      team2: {
        name: t2Name,
        sets: liveM.team_b_sets?.length ? liveM.team_b_sets : [liveM.team_b_games],
        game: Number(liveM.team_b_game) || liveM.team_b_games,
      },
      streamUrl: liveM.stream_url || YOUTUBE_URL,
    };
  }

  // Podium for finished competition
  let podium: EventItem["podium"] | undefined;
  if (isFinished) {
    const champ = teams.find((t) => t.final_stage === "champion");
    const runner = teams.find((t) => t.final_stage === "runner_up");
    const sfTeams = teams.filter((t) => t.final_stage === "sf");
    if (champ || runner) {
      podium = [
        champ ? { rank: 1, label: "Juara", name: champ.name, points: event.points?.champion, players: champ.players } : null,
        runner ? { rank: 2, label: "Runner-up", name: runner.name, points: event.points?.runner_up, players: runner.players } : null,
        ...sfTeams.map((t) => ({ rank: 3, label: "Semifinal", name: t.name, points: event.points?.sf, players: t.players })),
      ].filter(Boolean) as EventItem["podium"];
    } else {
      // Find final match
      const finalMatch = matches.find((m) => m.stage === "final" && m.status === "finished");
      if (finalMatch) {
        const champId = finalMatch.winner_team_id;
        const runnerId = champId === finalMatch.team_a_id ? finalMatch.team_b_id : finalMatch.team_a_id;
        podium = [
          { rank: 1, label: "Juara", name: teamNameOf(teams, champId), points: event.points?.champion, players: teams.find((t) => t.id === champId)?.players },
          { rank: 2, label: "Runner-up", name: teamNameOf(teams, runnerId), points: event.points?.runner_up, players: teams.find((t) => t.id === runnerId)?.players },
        ];
      }
    }
  }

  const registeredTeams = teams.map((t) => ({
    id: t.id,
    name: t.name,
    avatar: t.name.slice(0, 2).toUpperCase(),
  }));

  const courtStreams = courts
    .map((c) => ({ courtId: c.id, courtName: c.name, url: event.court_stream_urls?.[c.id] }))
    .filter((c): c is { courtId: string; courtName: string; url: string } => !!c.url);

  return {
    id: event.id,
    slug: event.slug,
    day: dateParts.day,
    date: dateParts.date,
    month: dateParts.month,
    year: dateParts.year,
    dateFormatted: dateParts.dateFormatted,
    type: "kompetisi",
    status,
    statusLabel: status === "live" ? "Berlangsung" : status === "finished" ? "Selesai" : "Pendaftaran dibuka",
    title: event.title,
    subtitle: `Fase grup + ${STAGE_LABEL[event.ko_start]?.toLowerCase() || "knockout"} · ${totalSlots} tim`,
    venue: venueName,
    court: courtNames,
    venueFormatted: `${venueName} · ${courtNames}`,
    time,
    price: eventPrice(event),
    slots: `${currentSlots}/${totalSlots} tim`,
    slotsPercent,
    aboutText: event.description || "Kompetisi pasangan tetap. Tim dibagi ke grup dan main round robin, lalu tim teratas tiap grup lolos ke babak gugur sampai final. Skor diperbarui langsung dari court.",
    formatBoxes: [
      { val: String(event.num_groups), label: "Grup" },
      { val: `Top ${event.advance_per_group}`, label: "Lolos per grup" },
      { val: STAGE_LABEL[event.ko_start] || "8 besar", label: "Knockout mulai" },
      { val: "1 set", label: "Per match" },
    ],
    availableTabs: courtStreams.length > 0
      ? ["info", "livestream", "match", "klasemen", "playoff"]
      : ["info", "match", "klasemen", "playoff"],
    defaultTab: isLive ? "match" : isFinished ? "klasemen" : "info",
    courtStreams: courtStreams.length > 0 ? courtStreams : undefined,
    liveScore,
    podium,
    pointsRules: event.points,
    registeredTeams,
    whatsapp_url: event.whatsapp_url,
    league_id: data.league?.id ?? null,
    league_name: data.league?.name ?? null,
    league_slug: data.league?.slug ?? null,
  };
}

async function mapMabarToEventItem(supabase: any, event: CompEvent): Promise<EventItem> {
  const [{ data: venue }, { data: courts }] = await Promise.all([
    event.venue_id ? supabase.from("venues").select("name").eq("id", event.venue_id).maybeSingle() : Promise.resolve({ data: null }),
    event.court_ids?.length ? supabase.from("courts").select("id, name").in("id", event.court_ids) : Promise.resolve({ data: [] }),
  ]);

  const venueName = venue?.name || "East Padel House";
  const courtList = courts ?? [];
  const courtNames = courtList.length > 0 ? formatCourtRange(courtList.map((c: any) => c.name)) : "Court 1";

  const dateParts = event.event_date
    ? parseDateParts(event.event_date)
    : parseDateParts(event.created_at.slice(0, 10));

  let participants: GenParticipant[] = [];
  let roundsData: any = null;
  let isLive = false;
  let liveScore: EventItem["liveScore"] | undefined;

  if (event.gen_event_id) {
    roundsData = await loadMabarRounds(supabase, event.id, event.gen_event_id);
    participants = roundsData.participants ?? [];
    const liveM = Object.values(roundsData.live ?? {}).find((m: any) => m.is_live) as Match | undefined;
    isLive = !!liveM;
    if (liveM) {
      liveScore = {
        title: `LIVE · ${liveM.set_label || "Mabar"}`.toUpperCase(),
        servingTeam: liveM.serve === "B" ? 2 : 1,
        team1: { name: liveM.team_a_name, sets: liveM.team_a_sets?.length ? liveM.team_a_sets : [liveM.team_a_games], game: Number(liveM.team_a_game) || liveM.team_a_games },
        team2: { name: liveM.team_b_name, sets: liveM.team_b_sets?.length ? liveM.team_b_sets : [liveM.team_b_games], game: Number(liveM.team_b_game) || liveM.team_b_games },
        streamUrl: liveM.stream_url || YOUTUBE_URL,
      };
    }
  }

  const isFinished = event.status === "finished";
  const isLiveStatus = isLive || event.status === "active";
  const status: "live" | "open" | "finished" = isFinished ? "finished" : isLiveStatus ? "live" : "open";

  const currentSlots = participants.length;
  const totalSlots = event.quota || (event.court_ids?.length ? event.court_ids.length * 4 : 8);
  const slotsPercent = Math.min(100, Math.round((currentSlots / totalSlots) * 100));

  const startTimeStr = event.start_time ? event.start_time.slice(0, 5) : "08:00";
  const time = formatTimeRangeStr(startTimeStr, eventDurationHours(event));

  let podium: EventItem["podium"] | undefined;
  if (isFinished && roundsData && participants.length > 0) {
    const table = mabarTable(participants, roundsData.matches, event.mabar_format, event.draw_seed);
    podium = table.slice(0, 3).map((r, idx) => ({
      rank: idx + 1,
      label: `Juara ${idx + 1}`,
      name: r.name,
      points: event.mabar_points?.ranks?.[idx] || 0,
    }));
  }

  const registeredParticipants = participants.map((p) => ({
    id: p.id,
    name: p.display_name,
    level: "Mabar",
    avatar: p.display_name.slice(0, 2).toUpperCase(),
  }));

  const courtStreams = courtList
    .map((c: Pick<Court, "id" | "name">) => ({ courtId: c.id, courtName: c.name, url: event.court_stream_urls?.[c.id] }))
    .filter((c: { courtId: string; courtName: string; url?: string }): c is { courtId: string; courtName: string; url: string } => !!c.url);

  return {
    id: event.id,
    slug: event.slug,
    day: dateParts.day,
    date: dateParts.date,
    month: dateParts.month,
    year: dateParts.year,
    dateFormatted: dateParts.dateFormatted,
    type: "mabar",
    status,
    statusLabel: status === "live" ? "Berlangsung" : status === "finished" ? "Selesai" : "Pendaftaran dibuka",
    title: event.title,
    subtitle: `${event.mabar_format ? MABAR_FORMAT_LABEL[event.mabar_format] : "Americano"} · semua level`,
    venue: venueName,
    court: courtNames,
    venueFormatted: `${venueName} · ${courtNames}`,
    time,
    price: eventPrice(event),
    slots: `${currentSlots}/${totalSlots} pemain`,
    slotsPercent,
    aboutText: event.description || "Mabar rutin komunitas dengan sistem rotasi per ronde. Kumpulkan poin individu dan skor tercatat secara real-time.",
    formatBoxes: [
      { val: String(totalSlots), label: "Pemain" },
      { val: event.mabar_format ? MABAR_FORMAT_LABEL[event.mabar_format] : "Americano", label: "Format mabar" },
      { val: String(event.rounds || 7), label: "Ronde main" },
      scoreModeBox(event.score_mode || "points", event.points_target || 24),
    ],
    availableTabs: courtStreams.length > 0
      ? ["info", "livestream", "match", "klasemen"]
      : ["info", "match", "klasemen"],
    defaultTab: isLive ? "match" : isFinished ? "klasemen" : "info",
    courtStreams: courtStreams.length > 0 ? courtStreams : undefined,
    liveScore,
    podium,
    registeredParticipants,
    whatsapp_url: event.whatsapp_url,
  };
}

export const getEventMatches = cache(async (slugOrId: string): Promise<EventMatchesData | null> => {
  try {
    const supabase = getPublicClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
    let q = supabase.from("events").select("*");
    q = isUuid ? q.or(`id.eq.${slugOrId},slug.eq.${slugOrId}`) : q.eq("slug", slugOrId);
    const { data: event } = await q.maybeSingle();

    if (event) {
      if (event.type === "kompetisi") {
        const data = await loadCompetition(supabase as any, { id: event.id });
        if (data) {
          return mapCompetitionToMatchesData(data);
        }
      } else if (event.gen_event_id) {
        const rounds = await loadMabarRounds(supabase as any, event.id, event.gen_event_id);
        return mapMabarToMatchesData(event, rounds);
      }
    }
  } catch (err) {
    console.error("Failed to fetch event matches from Supabase:", err);
  }

  // Fallback to mock matches
  const event = await getEventByIdOrSlug(slugOrId);
  if (!event) return null;
  const matchRecord = (matchesData.matches as unknown as Record<string, EventMatchesData>)[event.slug];
  return matchRecord || null;
});

function mapCompetitionToMatchesData(data: CompetitionData): EventMatchesData {
  const { event, courts, teams, matches, groups } = data;

  const groupRows: GroupData[] = groups.map((g) => ({
    name: `Grup ${g.label}`,
    rows: g.standings.map((s) => ({
      rank: s.rank,
      team: teamNameOf(teams, s.teamId),
      points: s.wins * 3,
      wl: `${s.wins}–${s.losses}`,
      diff: s.diff > 0 ? `+${s.diff}` : s.diff < 0 ? `−${Math.abs(s.diff)}` : "0",
      qualified: s.rank <= event.advance_per_group ? `Lolos · ${g.label}${s.rank}` : undefined,
      key: s.teamId,
    })),
  }));

  // Display "round" = this match's position in its own group's court queue (1st match on that
  // court, 2nd, ...), NOT `round_no` (the round-robin pairing round). With 4 teams per group a
  // round-robin round already has 2 simultaneous pairs, which bundled 2 matches per group into
  // one "Ronde" section — only the court queue position is actually simultaneous across groups,
  // since every group's court advances one match at a time on the same shared time grid.
  const groupStageMatches = matches.filter((m) => m.stage === "group");
  const slotByMatchId = new Map<string, number>();
  const byGroupLabel = new Map<string, typeof groupStageMatches>();
  for (const m of groupStageMatches) {
    const key = m.group_label ?? "";
    if (!byGroupLabel.has(key)) byGroupLabel.set(key, []);
    byGroupLabel.get(key)!.push(m);
  }
  for (const list of byGroupLabel.values()) {
    list.sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? ""));
    list.forEach((m, i) => slotByMatchId.set(m.id, i + 1));
  }

  const groupMatches: GroupMatch[] = groupStageMatches
    .map((m) => {
      const cName = courtNameOf(courts, m.court_id);
      const timeStr = m.starts_at ? isoToWibTime(m.starts_at) : "";
      const loc = [cName !== "—" ? cName : null, timeStr].filter(Boolean).join(" · ") || "Court";
      return {
        group: `Grup ${m.group_label || ""}`,
        round: slotByMatchId.get(m.id) ?? m.round_no ?? 0,
        court: loc,
        status: m.is_live ? "live" : m.status === "finished" ? "finished" : "waiting",
        team1: {
          id: m.team_a_id ?? undefined,
          name: teamNameOf(teams, m.team_a_id),
          score: m.status === "finished" || m.is_live ? String(m.team_a_games) : "",
          winner: m.status === "finished" && m.winner_team_id === m.team_a_id,
        },
        team2: {
          id: m.team_b_id ?? undefined,
          name: teamNameOf(teams, m.team_b_id),
          score: m.status === "finished" || m.is_live ? String(m.team_b_games) : "",
          winner: m.status === "finished" && m.winner_team_id === m.team_b_id,
        },
      };
    });

  // Every team's own match history (group + knockout), for the "lihat jadwal" popup — same idea
  // as a mabar pair's unitSchedules, but keyed by comp_teams id and labeled by stage.
  const teamSchedules: Record<string, { name: string; rows: TeamMatchRow[] }> = {};
  const historyMatches = matches
    .filter((m) => m.stage && m.team_a_id && m.team_b_id && !m.is_bye)
    .sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? ""));
  for (const m of historyMatches) {
    const label = m.stage === "group" ? `Grup ${m.group_label ?? ""}` : STAGE_LABEL[m.stage as KoStage] ?? "Final";
    const scored = m.status === "finished";
    const addRow = (teamId: string, oppId: string, mine: number, theirs: number) => {
      if (!teamSchedules[teamId]) teamSchedules[teamId] = { name: teamNameOf(teams, teamId), rows: [] };
      teamSchedules[teamId].rows.push({
        label,
        opponent: teamNameOf(teams, oppId),
        mine: scored ? mine : null,
        theirs: scored ? theirs : null,
        result: scored ? (mine > theirs ? "W" : "L") : null,
      });
    };
    addRow(m.team_a_id!, m.team_b_id!, m.team_a_games, m.team_b_games);
    addRow(m.team_b_id!, m.team_a_id!, m.team_b_games, m.team_a_games);
  }

  const koAll = matches.filter((m) => m.stage && m.stage !== "group");
  const qfMatches = koAll
    .filter((m) => m.stage === "qf")
    .map((m) => formatKnockoutMatch(m, teams, courts));

  const otherKoMatches = koAll
    .filter((m) => m.stage !== "qf")
    .map((m) => formatKnockoutMatch(m, teams, courts));

  let liveMatch: EventMatchesData["liveMatch"] | undefined;
  const liveM = matches.find((m) => m.is_live);
  if (liveM) {
    liveMatch = {
      court: courtNameOf(courts, liveM.court_id),
      time: liveM.starts_at ? isoToWibTime(liveM.starts_at) : "LIVE",
      round: matchLabel(liveM),
      team1: {
        name: teamNameOf(teams, liveM.team_a_id),
        score: liveM.team_a_games,
        serving: liveM.serve === "A",
        game: Number(liveM.team_a_game) || liveM.team_a_games,
      },
      team2: {
        name: teamNameOf(teams, liveM.team_b_id),
        score: liveM.team_b_games,
        serving: liveM.serve === "B",
        game: Number(liveM.team_b_game) || liveM.team_b_games,
      },
      streamUrl: liveM.stream_url || YOUTUBE_URL,
    };
  }

  return {
    groups: groupRows,
    groupMatches,
    quarterfinals: qfMatches.length > 0 ? qfMatches : undefined,
    knockout: otherKoMatches.length > 0 ? otherKoMatches : qfMatches.length > 0 ? [] : undefined,
    liveMatch,
    teamSchedules: Object.keys(teamSchedules).length > 0 ? teamSchedules : undefined,
  };
}

function formatKnockoutMatch(m: Match, teams: { id: string; name: string }[], courts: Court[]): KnockoutMatch {
  const cName = courtNameOf(courts, m.court_id);
  const timeStr = m.starts_at ? isoToWibTime(m.starts_at) : "";
  const loc = [cName !== "—" ? cName : null, timeStr].filter(Boolean).join(" · ") || "Court";
  return {
    round: matchLabel(m),
    court: loc,
    status: m.is_live ? "live" : m.status === "finished" ? "finished" : "waiting",
    team1: {
      id: m.team_a_id ?? undefined,
      name: teamNameOf(teams, m.team_a_id),
      score: m.status === "finished" || m.is_live ? String(m.team_a_games) : "",
      winner: m.status === "finished" && m.winner_team_id === m.team_a_id,
    },
    team2: {
      id: m.team_b_id ?? undefined,
      name: teamNameOf(teams, m.team_b_id),
      score: m.status === "finished" || m.is_live ? String(m.team_b_games) : "",
      winner: m.status === "finished" && m.winner_team_id === m.team_b_id,
    },
    streamUrl: m.stream_url || undefined,
  };
}

function mapMabarToMatchesData(event: CompEvent, roundsData: any): EventMatchesData {
  const { participants, rounds, matches, live } = roundsData;
  const pMap = new Map((participants ?? []).map((p: GenParticipant) => [p.id, p.display_name]));

  const table = mabarTable(participants, matches, event.mabar_format, event.draw_seed);
  const groups: GroupData[] = [
    {
      name: "Klasemen Akhir",
      rows: table.map((r, idx) => ({
        rank: idx + 1,
        team: r.name,
        points: r.diff,
        wl: `${r.wins}–${r.losses}`,
        diff: r.diff > 0 ? `+${r.diff}` : r.diff < 0 ? `−${Math.abs(r.diff)}` : "0",
        qualified: idx === 0 ? "Juara" : idx === 1 ? "Runner-up" : idx === 2 ? "3rd" : undefined,
        key: r.key,
      })),
    },
  ];

  const unitSchedules: Record<string, { name: string; rows: UnitMatchRow[] }> = {};
  for (const r of table) {
    unitSchedules[r.key] = { name: r.name, rows: unitSchedule(r.key, participants, rounds ?? [], matches ?? [], event.mabar_format) };
  }
  const byParticipantId = new Map<string, GenParticipant>((participants ?? []).map((p: GenParticipant) => [p.id, p]));
  const unitKeyOfIds = (ids: string[]) => {
    const p = byParticipantId.get(ids[0]);
    return p ? unitKey(p, event.mabar_format) : undefined;
  };

  const roundList: Array<{ round: string; time: string; status: string; p1: string; p2: string; s1: number; s2: number; p1Key?: string; p2Key?: string }> = [];
  for (const r of rounds ?? []) {
    const rMatches = (matches ?? []).filter((m: any) => m.round_id === r.id);
    for (let i = 0; i < rMatches.length; i++) {
      const m = rMatches[i];
      const p1 = (m.team_a_participant_ids ?? []).map((id: string) => pMap.get(id) || "?").join(" / ");
      const p2 = (m.team_b_participant_ids ?? []).map((id: string) => pMap.get(id) || "?").join(" / ");
      const finished = m.team_a_points != null && m.team_b_points != null;
      roundList.push({
        round: `Ronde ${r.round_no}`,
        time: rMatches.length > 1 ? `Court ${i + 1}` : "—",
        status: finished ? "finished" : "waiting",
        p1: p1 || "Tim A",
        p2: p2 || "Tim B",
        s1: m.team_a_points ?? 0,
        s2: m.team_b_points ?? 0,
        p1Key: unitKeyOfIds(m.team_a_participant_ids ?? []),
        p2Key: unitKeyOfIds(m.team_b_participant_ids ?? []),
      });
    }
  }

  const roundsTotal = (rounds ?? []).length;
  const roundsDone = (rounds ?? []).filter((r: any) => {
    const rMatches = (matches ?? []).filter((m: any) => m.round_id === r.id);
    return rMatches.length > 0 && rMatches.every((m: any) => m.team_a_points != null && m.team_b_points != null);
  }).length;

  let liveMatch: EventMatchesData["liveMatch"] | undefined;
  const liveM = Object.values(live ?? {}).find((m: any) => m.is_live) as Match | undefined;
  if (liveM) {
    liveMatch = {
      court: "Court 1",
      time: "LIVE",
      round: `Ronde ${liveM.round_no || 1}`,
      team1: {
        name: liveM.team_a_name,
        score: liveM.team_a_games,
        serving: liveM.serve === "A",
        game: Number(liveM.team_a_game) || liveM.team_a_games,
      },
      team2: {
        name: liveM.team_b_name,
        score: liveM.team_b_games,
        serving: liveM.serve === "B",
        game: Number(liveM.team_b_game) || liveM.team_b_games,
      },
      streamUrl: liveM.stream_url || YOUTUBE_URL,
    };
  }

  return {
    groups,
    rounds: roundList,
    roundsDone,
    roundsTotal,
    unitSchedules,
    liveMatch,
  };
}

export * from "./eventFormats";
