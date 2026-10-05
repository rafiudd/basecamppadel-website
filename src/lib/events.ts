import eventsData from "@/data/events.json";
import matchesData from "@/data/event-matches.json";
import { STAGE_LABEL } from "@/lib/competition";
import type { CompEvent, EventPoints, GenFormat, MabarPoints, PointCategoryItem, PointPresetRules } from "@/lib/database.types";

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
  availableTabs: Array<"info" | "match" | "klasemen" | "playoff">;
  defaultTab: "info" | "match" | "klasemen" | "playoff";
  liveScore?: {
    title: string;
    servingTeam: number;
    team1: { name: string; sets: number[]; game: number };
    team2: { name: string; sets: number[]; game: number };
    streamUrl: string;
  };
  podium?: Array<{ rank: number; label: string; name: string; points?: number }>;
  registeredParticipants?: Array<{ id: string; name: string; level: string; avatar: string }>;
  registeredTeams?: Array<{ id: string; name: string; avatar: string }>;
}

export interface KnockoutMatch {
  round: string;
  court: string;
  status: "live" | "next" | "waiting" | "finished";
  team1: { name: string; score: string; winner?: boolean };
  team2: { name: string; score: string; winner?: boolean };
  streamUrl?: string;
}

export interface GroupMatch {
  group: string;
  court: string;
  status: "live" | "next" | "waiting" | "finished";
  team1: { name: string; score: string; winner?: boolean };
  team2: { name: string; score: string; winner?: boolean };
}

export interface GroupRow {
  rank: number;
  team: string;
  points: number;
  wl: string;
  diff: string;
  qualified?: string;
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
  rounds?: Array<{ round: string; time: string; status: string; p1: string; p2: string; s1: number; s2: number }>;
}

export async function getEvents(): Promise<EventItem[]> {
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

export async function getEventByIdOrSlug(idOrSlug: string): Promise<EventItem | null> {
  const events = await getEvents();
  const found = events.find((e) => e.id === idOrSlug || e.slug === idOrSlug);
  return found || events[0] || null;
}

export async function getEventMatches(slugOrId: string): Promise<EventMatchesData | null> {
  const event = await getEventByIdOrSlug(slugOrId);
  if (!event) return null;
  const matchRecord = (matchesData.matches as unknown as Record<string, EventMatchesData>)[event.slug];
  return matchRecord || null;
}

/** Shared event helpers (labels, point presets). No I/O. */

export const MABAR_FORMAT_LABEL: Record<GenFormat, string> = {
  americano: "Americano",
  mexicano: "Mexicano",
  fixed_americano: "Fixed partner Americano",
  fixed_mexicano: "Fixed partner Mexicano",
};

export const isFixedFormat = (f: GenFormat | null | undefined) => f === "fixed_americano" || f === "fixed_mexicano";
/** Americano formats plan every round up front; Mexicano builds each round from the table. */
export const isAmericanoFormat = (f: GenFormat | null | undefined) => f === "americano" || f === "fixed_americano";

export function eventFormatLabel(e: Pick<CompEvent, "type" | "mabar_format" | "ko_start">): string {
  if (e.type === "mabar") return e.mabar_format ? MABAR_FORMAT_LABEL[e.mabar_format] : "Mabar";
  return `Fase grup + ${STAGE_LABEL[e.ko_start].toLowerCase()}`;
}

const DEFAULT_EVENT_POINTS: EventPoints = { champion: 80, runner_up: 50, sf: 30, qf: 15, r16: 10, group: 5 };
const DEFAULT_MABAR_POINTS: MabarPoints = { ranks: [30, 20, 10], participant: 5 };

const pts = (c: PointCategoryItem) => (c.checked && typeof c.points === "number" ? c.points : 0);

/**
 * Kompetisi preset categories (Poin menu) -> points per final stage, matched by name:
 * Juara, Runner-up, Semifinal, "8 besar" (lost in the quarterfinal), "Lolos grup" (lost in the
 * first knockout round when it starts above 8 besar, i.e. 16 besar), "Ikut fase grup". The seeded
 * "Lolos grup / 8 besar" covers both. "Juara 3" and custom categories (MVP, …) have no stage yet.
 */
function presetToEventPoints(items: PointCategoryItem[]): EventPoints {
  const out: EventPoints = { champion: 0, runner_up: 0, sf: 0, qf: 0, r16: 0, group: 0 };
  for (const c of items) {
    const n = c.name.toLowerCase().trim();
    if (n === "juara") out.champion = pts(c);
    else if (n.startsWith("runner")) out.runner_up = pts(c);
    else if (n.startsWith("semifinal")) out.sf = pts(c);
    else if (n.includes("fase grup")) out.group = pts(c);
    else {
      if (n.includes("8 besar")) out.qf = pts(c);
      if (n.includes("16 besar") || n.includes("lolos grup")) out.r16 = pts(c);
    }
  }
  return out;
}

/** Mabar preset categories ("Juara 1", "Juara 2", …, "Ikut serta") -> points per final rank. */
function presetToMabarPoints(items: PointCategoryItem[]): MabarPoints {
  const ranks: number[] = [];
  let participant = 0;
  for (const c of items) {
    const n = c.name.toLowerCase().trim();
    const m = n.match(/^juara\s*(\d+)$/);
    if (m) ranks[Number(m[1]) - 1] = pts(c);
    else if (n.startsWith("ikut")) participant = pts(c);
  }
  return { ranks: Array.from(ranks, (v) => v ?? 0), participant };
}

export function presetPoints(rules: PointPresetRules | null | undefined) {
  return {
    points: rules ? presetToEventPoints(rules.kompetisi ?? []) : DEFAULT_EVENT_POINTS,
    mabar_points: rules ? presetToMabarPoints(rules.mabar ?? []) : DEFAULT_MABAR_POINTS,
  };
}
