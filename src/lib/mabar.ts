import type { createClient } from "@/lib/supabase/server";
import { isFixedFormat } from "@/lib/events";
import { shuffle } from "@/lib/competition";
import { mabarStandings, type MabarResult, type MabarStanding } from "@/lib/mabarRules";
import type { CompEvent, Court, GenFormat, GenMatch, GenParticipant, GenRound, Match } from "@/lib/database.types";

/** A mabar event's rounds, courts and table (stored in the generator tables, see 0006/0007). */

type Supa = Awaited<ReturnType<typeof createClient>>;

export type MabarData = {
  event: CompEvent;
  participants: GenParticipant[];
  rounds: GenRound[];
  matches: GenMatch[];
  /** The `matches` row of each court (live scoring / ON AIR), by gen_match_id. */
  live: Record<string, Match>;
  courts: Pick<Court, "id" | "name">[];
  players: { id: string; name: string }[];
  presetName: string | null;
};

export const isScored = (m: Pick<GenMatch, "team_a_points" | "team_b_points">) => m.team_a_points != null && m.team_b_points != null;

export async function loadMabarRounds(supabase: Supa, eventId: string, genId: string) {
  const [{ data: participants }, { data: rounds }, { data: live }] = await Promise.all([
    supabase.from("gen_participants").select("*").eq("event_id", genId).order("created_at"),
    supabase.from("gen_rounds").select("*").eq("event_id", genId).order("round_no"),
    supabase.from("matches").select("*").eq("event_id", eventId).not("gen_match_id", "is", null),
  ]);
  const roundIds = (rounds ?? []).map((r) => r.id);
  const { data: matches } = roundIds.length
    ? await supabase.from("gen_matches").select("*").in("round_id", roundIds).order("created_at")
    : { data: [] as GenMatch[] };
  return {
    participants: participants ?? [],
    rounds: rounds ?? [],
    matches: matches ?? [],
    live: Object.fromEntries((live ?? []).map((m) => [m.gen_match_id!, m])),
  };
}

/** Where the event stands: last round, whether it is fully scored, and how many rounds are done. */
export function mabarProgress(rounds: GenRound[], matches: GenMatch[], totalRounds: number) {
  const roundDone = (r: GenRound) => matches.filter((m) => m.round_id === r.id).every(isScored);
  const last = rounds.at(-1) ?? null;
  const lastDone = !!last && roundDone(last);
  return {
    last,
    lastDone,
    allPlanned: rounds.length >= totalRounds,
    allDone: rounds.length >= totalRounds && rounds.every(roundDone),
    doneRounds: rounds.filter(roundDone).length,
    started: matches.some(isScored),
  };
}

// ---------------------------------------------------------------- table

/** What the table ranks: a player (free formats) or a fixed pair (`t<team_no>`). */
export type MabarUnit = { key: string; name: string; members: GenParticipant[] };

export const unitKey = (p: Pick<GenParticipant, "id" | "team_no">, format: GenFormat | null) =>
  isFixedFormat(format) && p.team_no != null ? `t${p.team_no}` : p.id;

export function mabarUnits(participants: GenParticipant[], format: GenFormat | null): MabarUnit[] {
  const units = new Map<string, MabarUnit>();
  for (const p of participants) {
    const k = unitKey(p, format);
    const u = units.get(k) ?? { key: k, name: "", members: [] };
    u.members.push(p);
    units.set(k, u);
  }
  for (const u of units.values()) {
    // a substituted player keeps their games but the pair shows its current line-up first
    const current = u.members.filter((m) => m.active);
    u.name = (current.length ? current : u.members).map((m) => m.display_name).join(" & ");
  }
  return [...units.values()];
}

/** Scored courts as table results, sides expressed as unit keys. */
export function mabarResults(matches: GenMatch[], participants: GenParticipant[], format: GenFormat | null): MabarResult[] {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const side = (ids: string[]) => [...new Set(ids.map((id) => byId.get(id)).filter((p): p is GenParticipant => !!p).map((p) => unitKey(p, format)))];
  return matches.filter(isScored).map((m) => ({ a: side(m.team_a_participant_ids), b: side(m.team_b_participant_ids), ga: m.team_a_points!, gb: m.team_b_points! }));
}

export type MabarRow = MabarStanding & { name: string; unit: MabarUnit };

export function mabarTable(participants: GenParticipant[], matches: GenMatch[], format: GenFormat | null, seed: number): MabarRow[] {
  const units = mabarUnits(participants, format);
  const byKey = new Map(units.map((u) => [u.key, u]));
  return mabarStandings(units.map((u) => u.key), mabarResults(matches, participants, format), seed).map((s) => ({
    ...s,
    name: byKey.get(s.key)!.name,
    unit: byKey.get(s.key)!,
  }));
}

// ---------------------------------------------------------------- wizard preview

export type CourtPairing = { a: string[]; b: string[] };

/**
 * Example round 1 for the wizard (the real schedule is made on the event page after check-in):
 * free formats put 4 players per court, fixed formats 2 pairs per court; extras sit out.
 */
export function previewRoundOne({ seed, players, pairs, courts }: { seed: number; players: string[]; pairs: string[][] | null; courts: number }): CourtPairing[] {
  let s = seed * 7919 + 13;
  const rand = () => ((s = (s * 9301 + 49297) % 233280), s / 233280);
  if (pairs) {
    const units = shuffle(pairs, rand);
    const n = Math.min(courts, Math.floor(units.length / 2));
    return Array.from({ length: n }, (_, i) => ({ a: units[2 * i], b: units[2 * i + 1] }));
  }
  const order = shuffle(players, rand);
  const n = Math.min(courts, Math.floor(order.length / 4));
  return Array.from({ length: n }, (_, i) => ({ a: order.slice(4 * i, 4 * i + 2), b: order.slice(4 * i + 2, 4 * i + 4) }));
}
