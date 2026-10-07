/**
 * Pure rules for starting a match and putting it ON AIR (no I/O, no runtime imports, so it can be
 * unit-tested with `npm test`). Used by the live server actions and the Match tab.
 */

import type { Match } from "@/lib/database.types";

type Side = "A" | "B";

export type MatchSides = Pick<
  Match,
  "id" | "team_a_id" | "team_b_id" | "team_a_name" | "team_b_name" | "team_a_player_ids" | "team_b_player_ids"
>;

/**
 * The first running match that shares a team (kompetisi) or a player (mabar) with `m`, and which side
 * of `m` that is. A match can't start while that is the case: the same people would be on two courts.
 */
export function findTeamClash<T extends MatchSides>(m: MatchSides, running: T[]): { side: Side; with: T } | null {
  for (const o of running) {
    if (o.id === m.id) continue;
    const teamsOf = new Set([o.team_a_id, o.team_b_id].filter(Boolean));
    if (m.team_a_id && teamsOf.has(m.team_a_id)) return { side: "A", with: o };
    if (m.team_b_id && teamsOf.has(m.team_b_id)) return { side: "B", with: o };
    const playersOf = new Set([...(o.team_a_player_ids ?? []), ...(o.team_b_player_ids ?? [])]);
    if ((m.team_a_player_ids ?? []).some((p) => playersOf.has(p))) return { side: "A", with: o };
    if ((m.team_b_player_ids ?? []).some((p) => playersOf.has(p))) return { side: "B", with: o };
  }
  return null;
}

export type StartConflict<T> = { kind: "court"; with: T } | { kind: "capacity"; running: number; courts: number };

/**
 * Worth a confirmation before "Mulai" (not refused, courts change on the day): the match's court is
 * still busy with another running match, or as many matches run as the event has courts.
 */
export function findStartConflict<T extends Pick<Match, "id" | "status" | "court_id">>(
  m: Pick<Match, "id" | "court_id">,
  matches: T[],
  courtCount: number,
): StartConflict<T> | null {
  const running = matches.filter((o) => o.status === "live" && o.id !== m.id);
  const sameCourt = m.court_id ? running.find((o) => o.court_id === m.court_id) : undefined;
  if (sameCourt) return { kind: "court", with: sameCourt };
  const courts = Math.max(1, courtCount);
  if (running.length >= courts) return { kind: "capacity", running: running.length, courts };
  return null;
}
