import eventsData from "@/data/events.json";
import matchesData from "@/data/event-matches.json";

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
