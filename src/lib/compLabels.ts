import { compareRecord, STAGE_LABEL, type KoStage } from "@/lib/competition";
import type { GroupView } from "@/lib/compData";
import type { Match } from "@/lib/database.types";

/** Display labels for competition matches. Pure, shared by admin and public views. */

/** Short knockout code: "QF1", "SF2", "R16-3", "Final". */
export function koShort(m: Pick<Match, "stage" | "bracket_pos">) {
  if (m.stage === "final") return "Final";
  const short: Record<string, string> = { r16: "R16-", qf: "QF", sf: "SF" };
  return `${short[m.stage ?? ""] ?? ""}${m.bracket_pos ?? ""}`;
}

/** Section a match belongs to: "Grup A", "Semifinal · SF1", "Final", or a mabar's "Ronde 2". */
export function matchSection(m: Pick<Match, "stage" | "bracket_pos" | "group_label" | "set_label">) {
  if (!m.stage) return m.set_label;
  if (m.stage === "group") return `Grup ${m.group_label ?? ""}`;
  if (m.stage === "final") return "Final";
  return `${STAGE_LABEL[m.stage as KoStage]} · ${koShort(m)}`;
}

/** Spoken name of a match: "Grup A · Match 2", "Semifinal 1", "Final", "Ronde 2". `all` numbers group matches. */
export function matchName(m: Match, all: Match[]) {
  if (!m.stage) return m.set_label;
  if (m.stage === "group") {
    const n = all.filter((x) => x.stage === "group" && x.group_label === m.group_label).findIndex((x) => x.id === m.id) + 1;
    return `Grup ${m.group_label} · Match ${n}`;
  }
  if (m.stage === "final") return "Final";
  return `${STAGE_LABEL[m.stage as KoStage]} ${m.bracket_pos ?? ""}`.trim();
}

/** "Pemenang SF1" placeholder for a knockout slot whose team is not known yet. */
export function feederLabel(all: Match[]) {
  return (m: Match, side: "A" | "B") => {
    const feeder = all.find((f) => f.next_match_id === m.id && f.next_slot === side);
    return feeder ? `Pemenang ${koShort(feeder)}` : "TBD";
  };
}

/** A knockout slot still waiting for the winner of an earlier match (mabar courts always have both sides). */
export const awaitingTeams = (m: Pick<Match, "gen_match_id" | "team_a_id" | "team_b_id">) => !m.gen_match_id && (!m.team_a_id || !m.team_b_id);

/** Team names of a match, with "Pemenang SF1" for unknown knockout slots. */
export function matchTeams(m: Match, all: Match[]) {
  if (m.gen_match_id) return { a: m.team_a_name, b: m.team_b_name };
  const waiting = feederLabel(all);
  return {
    a: m.team_a_id ? m.team_a_name : waiting(m, "A"),
    b: m.team_b_id ? m.team_b_name : waiting(m, "B"),
  };
}

export type Seed = { no: number; code: string };

/** teamId -> { no: overall seed, code: "A1" }, in the seeding order of buildFirstRound. */
export function seedMap(groups: GroupView[], advance: number): Record<string, Seed> {
  const out: Record<string, Seed> = {};
  let no = 1;
  for (let k = 0; k < advance; k++) {
    const tier = groups
      .map((g) => ({ row: g.standings[k], label: g.label }))
      .filter((t) => t.row)
      .sort((x, y) => compareRecord(x.row, y.row) || x.label.localeCompare(y.label));
    for (const t of tier) out[t.row.teamId] = { no: no++, code: `${t.label}${k + 1}` };
  }
  return out;
}
