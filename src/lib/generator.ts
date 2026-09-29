import type { GenFormat } from "@/lib/database.types";

export type Pool = { id: string; team_no: number | null; total_points: number; sits_out_count: number };

export type RoundPairing = { team_a: string[]; team_b: string[] };

export type GenerateRoundResult = { pairings: RoundPairing[]; benchedIds: string[] };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Split a pool into who plays this round (courtCapacity worth, in groups of `groupSize`) and who sits out, prioritizing fewest past sits-out. */
function trimToCapacity<T extends { sits_out_count: number }>(pool: T[], groupSize: number, capacityUnits: number) {
  const maxPlay = Math.floor(Math.min(pool.length, capacityUnits) / groupSize) * groupSize;
  const sorted = [...pool].sort((a, b) => a.sits_out_count - b.sits_out_count || Math.random() - 0.5);
  return { play: sorted.slice(0, maxPlay), benched: sorted.slice(maxPlay) };
}

/** Americano/Mexicano: individuals, partners rotate every round. Groups of 4 -> 2v2 per court. */
function generateFreeRound(format: "americano" | "mexicano", pool: Pool[], courtCount: number, partnerHistory: Map<string, number>): GenerateRoundResult {
  const { play, benched } = trimToCapacity(pool, 4, courtCount * 4);

  if (format === "mexicano" && play.some((p) => p.total_points > 0)) {
    // Ranked: sort by standing, chunk into groups of 4, pair 1st+4th vs 2nd+3rd (balances team strength).
    const ranked = [...play].sort((a, b) => b.total_points - a.total_points);
    const pairings: RoundPairing[] = [];
    for (let i = 0; i + 3 < ranked.length; i += 4) {
      const [p1, p2, p3, p4] = ranked.slice(i, i + 4);
      pairings.push({ team_a: [p1.id, p4.id], team_b: [p2.id, p3.id] });
    }
    return { pairings, benchedIds: benched.map((p) => p.id) };
  }

  // Free/random: try several shuffles, keep the one with fewest repeat partner-pairs.
  let best: { groups: string[][]; score: number } | null = null;
  for (let attempt = 0; attempt < 200; attempt++) {
    const shuffled = shuffle(play.map((p) => p.id));
    const groups: string[][] = [];
    for (let i = 0; i + 3 < shuffled.length; i += 4) groups.push(shuffled.slice(i, i + 4));
    let score = 0;
    for (const g of groups) {
      score += (partnerHistory.get(pairKey(g[0], g[1])) ?? 0) + (partnerHistory.get(pairKey(g[2], g[3])) ?? 0);
    }
    if (!best || score < best.score) best = { groups, score };
    if (score === 0) break;
  }
  const pairings = (best?.groups ?? []).map((g) => ({ team_a: [g[0], g[1]], team_b: [g[2], g[3]] }));
  return { pairings, benchedIds: benched.map((p) => p.id) };
}

type Team = { team_no: number; ids: string[]; total_points: number; sits_out_count: number };

function buildTeams(pool: Pool[]): Team[] {
  const byTeam = new Map<number, Pool[]>();
  for (const p of pool) {
    if (p.team_no == null) continue;
    const arr = byTeam.get(p.team_no) ?? [];
    arr.push(p);
    byTeam.set(p.team_no, arr);
  }
  return [...byTeam.entries()].map(([team_no, members]) => ({
    team_no,
    ids: members.map((m) => m.id),
    total_points: members.reduce((s, m) => s + m.total_points, 0),
    sits_out_count: members.reduce((s, m) => s + m.sits_out_count, 0) / members.length,
  }));
}

/** Fixed Partner Americano/Mexicano: partner is fixed, opponents rotate every round. Teams paired 2 at a time per court. */
function generateFixedRound(format: "fixed_americano" | "fixed_mexicano", pool: Pool[], courtCount: number, opponentHistory: Map<string, number>): GenerateRoundResult {
  const teams = buildTeams(pool);
  const { play, benched } = trimToCapacity(teams, 2, courtCount * 2);

  if (format === "fixed_mexicano" && play.some((t) => t.total_points > 0)) {
    const ranked = [...play].sort((a, b) => b.total_points - a.total_points);
    const pairings: RoundPairing[] = [];
    for (let i = 0; i + 1 < ranked.length; i += 2) {
      pairings.push({ team_a: ranked[i].ids, team_b: ranked[i + 1].ids });
    }
    const benchedIds = benched.flatMap((t) => t.ids);
    return { pairings, benchedIds };
  }

  let best: { order: Team[]; score: number } | null = null;
  for (let attempt = 0; attempt < 200; attempt++) {
    const shuffled = shuffle(play);
    let score = 0;
    for (let i = 0; i + 1 < shuffled.length; i += 2) {
      score += opponentHistory.get(pairKey(String(shuffled[i].team_no), String(shuffled[i + 1].team_no))) ?? 0;
    }
    if (!best || score < best.score) best = { order: shuffled, score };
    if (score === 0) break;
  }
  const pairings: RoundPairing[] = [];
  const order = best?.order ?? [];
  for (let i = 0; i + 1 < order.length; i += 2) {
    pairings.push({ team_a: order[i].ids, team_b: order[i + 1].ids });
  }
  const benchedIds = benched.flatMap((t) => t.ids);
  return { pairings, benchedIds };
}

export function generateRound(format: GenFormat, pool: Pool[], courtCount: number, history: Map<string, number>): GenerateRoundResult {
  if (format === "americano" || format === "mexicano") return generateFreeRound(format, pool, courtCount, history);
  return generateFixedRound(format, pool, courtCount, history);
}

export { pairKey };
