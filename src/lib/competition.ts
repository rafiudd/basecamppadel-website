/**
 * Pure competition logic (group stage + knockout). No I/O, no imports, so it can be
 * unit-tested with `npm test` (node --test). See TASK_EVENT_KOMPETISI.md for the rules.
 */

export type KoStage = "r16" | "qf" | "sf" | "final";
export type Stage = "group" | KoStage;
export type FinalStage = "champion" | "runner_up" | "sf" | "qf" | "r16" | "group";

export const STAGE_LABEL: Record<Stage, string> = {
  group: "Fase grup",
  r16: "16 besar",
  qf: "8 besar",
  sf: "Semifinal",
  final: "Final",
};

export const STAGE_SHORT: Record<Stage, string> = { group: "G", r16: "R16-", qf: "QF", sf: "SF", final: "F" };

export const FINAL_STAGE_LABEL: Record<FinalStage, string> = {
  champion: "Juara",
  runner_up: "Runner-up",
  sf: "Semifinal",
  qf: "8 besar",
  r16: "16 besar",
  group: "Fase grup",
};

export const KO_ORDER: KoStage[] = ["r16", "qf", "sf", "final"];
const STAGE_FOR_SLOTS: Record<number, KoStage> = { 16: "r16", 8: "qf", 4: "sf", 2: "final" };

export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function groupLabel(i: number): string {
  return String.fromCharCode(65 + i);
}

/** Group sizes that differ by at most 1, larger groups first. */
export function groupSizes(teams: number, groups: number): number[] {
  if (groups < 1) return [];
  const base = Math.floor(teams / groups);
  const extra = teams % groups;
  return Array.from({ length: groups }, (_, i) => base + (i < extra ? 1 : 0));
}

// ---------------------------------------------------------------------------
// Format planning / validation
// ---------------------------------------------------------------------------

export type FormatPlan = {
  sizes: number[];
  qualifiers: number;
  slots: number;
  byes: number;
  koStart: KoStage | null;
  koStages: KoStage[];
  groupMatches: number;
  koMatches: number;
  flow: string[];
  errors: string[];
};

export function planFormat(input: { teams: number; groups: number; advance: number }): FormatPlan {
  const { teams, groups, advance } = input;
  const errors: string[] = [];
  const sizes = groupSizes(teams, groups);
  const minSize = sizes.length ? Math.min(...sizes) : 0;

  if (groups < 1) errors.push("Minimal 1 grup.");
  else if (minSize < 3) errors.push("Setiap grup minimal 3 tim. Kurangi jumlah grup atau tambah tim.");
  if (advance < 1) errors.push("Minimal 1 tim lolos per grup.");
  else if (minSize >= 3 && advance >= minSize)
    errors.push(`Tim lolos per grup harus lebih sedikit dari jumlah tim di grup terkecil (${minSize}).`);

  const qualifiers = Math.max(0, groups) * Math.max(0, advance);
  if (qualifiers < 2) errors.push("Minimal 2 tim harus lolos ke knockout.");
  if (qualifiers > 16) errors.push("Maksimal 16 tim di knockout.");

  const slots = qualifiers >= 2 && qualifiers <= 16 ? nextPow2(qualifiers) : 0;
  const koStart = slots ? STAGE_FOR_SLOTS[slots] : null;
  const koStages = koStart ? KO_ORDER.slice(KO_ORDER.indexOf(koStart)) : [];
  const rr = (n: number) => (n * (n - 1)) / 2;

  // "2 grup × 3 tim" or "1 grup × 4 tim + 2 grup × 3 tim"
  const bySize = new Map<number, number>();
  for (const s of sizes) bySize.set(s, (bySize.get(s) ?? 0) + 1);
  const groupDesc = [...bySize.entries()].map(([size, count]) => `${count} grup × ${size} tim`).join(" + ");

  return {
    sizes,
    qualifiers,
    slots,
    byes: slots ? slots - qualifiers : 0,
    koStart,
    koStages,
    groupMatches: sizes.reduce((s, n) => s + rr(n), 0),
    koMatches: slots ? qualifiers - 1 : 0,
    flow: groupDesc ? [groupDesc, `top ${advance}`, ...koStages.map((s) => STAGE_LABEL[s])] : [],
    errors,
  };
}

// ---------------------------------------------------------------------------
// Groups + round robin
// ---------------------------------------------------------------------------

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Randomly split teams into `groups` groups whose sizes differ by at most 1. */
export function splitIntoGroups<T>(ids: T[], groups: number, rand: () => number = Math.random): T[][] {
  const shuffled = shuffle(ids, rand);
  const out: T[][] = [];
  let k = 0;
  for (const size of groupSizes(ids.length, groups)) {
    out.push(shuffled.slice(k, k + size));
    k += size;
  }
  return out;
}

/** Circle-method round robin: every pair meets exactly once. Returns rounds of pairs. */
export function roundRobin<T>(ids: T[]): [T, T][][] {
  const list: (T | null)[] = [...ids];
  if (list.length % 2) list.push(null);
  const n = list.length;
  const rounds: [T, T][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [T, T][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a !== null && b !== null) pairs.push(r % 2 ? [b, a] : [a, b]);
    }
    rounds.push(pairs);
    list.splice(1, 0, list.pop()!);
  }
  return rounds;
}

/** All group matches, interleaved round by round across groups (so teams get rest between matches). */
export function groupFixtures(groups: { label: string; teamIds: string[] }[]) {
  const perGroup = groups.map((g) => ({ label: g.label, rounds: roundRobin(g.teamIds) }));
  const maxRounds = Math.max(0, ...perGroup.map((g) => g.rounds.length));
  const out: { group: string; round: number; a: string; b: string }[] = [];
  for (let r = 0; r < maxRounds; r++) {
    for (const g of perGroup) {
      for (const [a, b] of g.rounds[r] ?? []) out.push({ group: g.label, round: r + 1, a, b });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

/**
 * Greedy court/slot assignment, in list order. A team never plays twice in one slot, and an item
 * listed in `after` (indexes of other items) must sit in an earlier slot.
 */
export function assignSlots(items: { teams: string[]; after?: number[] }[], courtCount: number) {
  const res: ({ slot: number; court: number } | undefined)[] = new Array(items.length);
  let remaining = items.map((_, i) => i);
  const courts = Math.max(1, courtCount);
  let slot = 0;
  while (remaining.length && slot < items.length * 4 + 8) {
    const busy = new Set<string>();
    const used: number[] = [];
    for (const idx of remaining) {
      if (used.length >= courts) break;
      const it = items[idx];
      if (it.teams.some((t) => busy.has(t))) continue;
      if ((it.after ?? []).some((d) => res[d] === undefined || res[d]!.slot >= slot)) continue;
      res[idx] = { slot, court: used.length };
      used.push(idx);
      it.teams.forEach((t) => busy.add(t));
    }
    remaining = remaining.filter((i) => !used.includes(i));
    slot++;
  }
  return res.map((r) => r ?? { slot, court: 0 });
}

export type TimedMatch = { id: string; court_id: string | null; starts_at: string | null; teams: string[] };
export type Conflict = { a: string; b: string; kind: "court" | "team" };

/** Matches overlapping in time that share a court or a team. */
export function findConflicts(matches: TimedMatch[], minutes: number): Conflict[] {
  const out: Conflict[] = [];
  const timed = matches.filter((m) => m.starts_at);
  const dur = Math.max(1, minutes) * 60_000;
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const x = timed[i];
      const y = timed[j];
      if (Math.abs(new Date(x.starts_at!).getTime() - new Date(y.starts_at!).getTime()) >= dur) continue;
      if (x.court_id && x.court_id === y.court_id) out.push({ a: x.id, b: y.id, kind: "court" });
      else if (x.teams.some((t) => y.teams.includes(t))) out.push({ a: x.id, b: y.id, kind: "team" });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Standings
// ---------------------------------------------------------------------------

export type ResultMatch = {
  a: string;
  b: string;
  ga: number;
  gb: number;
  winner: string | null;
  wo: boolean;
  finished: boolean;
};

export type StandingRow = {
  teamId: string;
  played: number;
  wins: number;
  losses: number;
  gw: number;
  gl: number;
  diff: number;
  rank: number;
};

/** Deterministic "undian": stable pseudo-random number per (seed, team). */
export function lottery(seed: number, teamId: string): number {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < teamId.length; i++) {
    h ^= teamId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Group table. Win = 1 point. Tiebreak: wins → head-to-head (only when exactly 2 teams tie) →
 * game difference → games won → lottery. WO counts as a win/loss but adds no games.
 */
export function computeStandings(teamIds: string[], matches: ResultMatch[], seed = 0): StandingRow[] {
  const rows = new Map<string, StandingRow>(
    teamIds.map((id) => [id, { teamId: id, played: 0, wins: 0, losses: 0, gw: 0, gl: 0, diff: 0, rank: 0 }]),
  );
  const done = matches.filter((m) => m.finished && m.winner && rows.has(m.a) && rows.has(m.b));
  for (const m of done) {
    const ra = rows.get(m.a)!;
    const rb = rows.get(m.b)!;
    ra.played++;
    rb.played++;
    if (m.winner === m.a) {
      ra.wins++;
      rb.losses++;
    } else {
      rb.wins++;
      ra.losses++;
    }
    if (!m.wo) {
      ra.gw += m.ga;
      ra.gl += m.gb;
      rb.gw += m.gb;
      rb.gl += m.ga;
    }
  }
  for (const r of rows.values()) r.diff = r.gw - r.gl;

  const fallback = (x: StandingRow, y: StandingRow) =>
    y.diff - x.diff || y.gw - x.gw || lottery(seed, x.teamId) - lottery(seed, y.teamId);

  const byWins = [...rows.values()].sort((x, y) => y.wins - x.wins);
  const out: StandingRow[] = [];
  for (let i = 0; i < byWins.length; ) {
    let j = i;
    while (j < byWins.length && byWins[j].wins === byWins[i].wins) j++;
    const block = byWins.slice(i, j);
    if (block.length === 2) {
      const [x, y] = block;
      const h2h = done.find((m) => (m.a === x.teamId && m.b === y.teamId) || (m.a === y.teamId && m.b === x.teamId));
      if (h2h) block.sort((p) => (p.teamId === h2h.winner ? -1 : 1));
      else block.sort(fallback);
    } else {
      block.sort(fallback);
    }
    out.push(...block);
    i = j;
  }
  out.forEach((r, i) => (r.rank = i + 1));
  return out;
}

/** Cross-group comparison (used for seeding and byes): wins → game difference → games won. */
export function compareRecord(x: StandingRow, y: StandingRow): number {
  return y.wins - x.wins || y.diff - x.diff || y.gw - x.gw;
}

// ---------------------------------------------------------------------------
// Bracket
// ---------------------------------------------------------------------------

/** Standard seeding positions: p=4 → [1,4,2,3], p=8 → [1,8,4,5,2,7,3,6]. */
export function seedOrder(p: number): number[] {
  let order = [1, 2];
  while (order.length < p) {
    const n = order.length * 2;
    order = order.flatMap((s) => [s, n + 1 - s]);
  }
  return order.slice(0, p);
}

export type GroupResult = { label: string; ranked: StandingRow[] };

/**
 * First-round slots in bracket order (pairs [0,1], [2,3], …); null = bye.
 * Cross seeding A1–B2, B1–A2 (4 groups: A1–B2, C1–D2, B1–A2, D1–C2) when qualifiers fill the
 * bracket exactly with top 2 from an even number of groups; otherwise standard seeding by tier
 * (all group winners first, best record first, so byes go to the best winners), then teams from the
 * same group meeting in round 1 are swapped apart.
 */
export function buildFirstRound(groups: GroupResult[], advance: number): (string | null)[] {
  const q = groups.length * advance;
  const p = nextPow2(q);
  const at = (g: GroupResult, k: number) => g.ranked[k]?.teamId ?? null;

  if (advance === 2 && groups.length % 2 === 0 && q === p) {
    const top: (string | null)[] = [];
    const bottom: (string | null)[] = [];
    for (let i = 0; i < groups.length; i += 2) {
      const x = groups[i];
      const y = groups[i + 1];
      top.push(at(x, 0), at(y, 1));
      bottom.push(at(y, 0), at(x, 1));
    }
    return [...top, ...bottom];
  }

  const groupOf = new Map<string, string>();
  const seeds: StandingRow[] = [];
  for (let k = 0; k < advance; k++) {
    const tier = groups
      .map((g) => ({ row: g.ranked[k], label: g.label }))
      .filter((t) => t.row)
      .sort((x, y) => compareRecord(x.row, y.row) || x.label.localeCompare(y.label));
    for (const t of tier) {
      groupOf.set(t.row.teamId, t.label);
      seeds.push(t.row);
    }
  }
  const slots = seedOrder(p).map((s) => (s <= seeds.length ? seeds[s - 1].teamId : null));

  const sameGroup = (i: number) => {
    const a = slots[i - (i % 2)];
    const b = slots[i - (i % 2) + 1];
    return !!a && !!b && groupOf.get(a) === groupOf.get(b);
  };
  for (let i = 0; i < slots.length; i += 2) {
    if (!sameGroup(i)) continue;
    for (let j = 0; j < slots.length; j++) {
      if (j === i || j === i + 1 || !slots[j] || j % 2 === 0) continue;
      [slots[i + 1], slots[j]] = [slots[j], slots[i + 1]];
      if (!sameGroup(i) && !sameGroup(j)) break;
      [slots[i + 1], slots[j]] = [slots[j], slots[i + 1]];
    }
  }
  return slots;
}

export type BracketPlan = {
  stage: KoStage;
  pos: number;
  a: string | null;
  b: string | null;
  bye: boolean;
  next: number | null;
  nextSlot: "A" | "B" | null;
};

/** All knockout matches from first-round slots. Bye winners are already placed in round 2. */
export function planBracket(first: (string | null)[]): BracketPlan[] {
  const p = first.length;
  const plans: BracketPlan[] = [];
  const offsets: number[] = [];
  for (let size = p, offset = 0; size >= 2; size /= 2) {
    offsets.push(offset);
    const stage = STAGE_FOR_SLOTS[size];
    for (let j = 0; j < size / 2; j++) {
      plans.push({ stage, pos: j + 1, a: null, b: null, bye: false, next: null, nextSlot: null });
    }
    offset += size / 2;
  }
  let r = 0;
  for (let size = p; size >= 2; size /= 2, r++) {
    for (let j = 0; j < size / 2; j++) {
      const m = plans[offsets[r] + j];
      if (size > 2) {
        m.next = offsets[r + 1] + Math.floor(j / 2);
        m.nextSlot = j % 2 === 0 ? "A" : "B";
      }
    }
  }
  for (let j = 0; j < p / 2; j++) {
    const m = plans[j];
    m.a = first[2 * j];
    m.b = first[2 * j + 1];
    if ((m.a === null) !== (m.b === null)) {
      m.bye = true;
      const winner = m.a ?? m.b;
      if (m.next !== null) {
        const n = plans[m.next];
        if (m.nextSlot === "A") n.a = winner;
        else n.b = winner;
      }
    }
  }
  return plans;
}

/** Final stage per team once the final is finished; null if not finished yet. */
export function computeFinalStages(
  teamIds: string[],
  koMatches: { stage: KoStage; a: string | null; b: string | null; winner: string | null; bye: boolean; finished: boolean }[],
): Record<string, FinalStage> | null {
  const final = koMatches.find((m) => m.stage === "final");
  if (!final || !final.finished || !final.winner) return null;
  const out: Record<string, FinalStage> = Object.fromEntries(teamIds.map((id) => [id, "group" as FinalStage]));
  for (const m of koMatches) {
    if (m.bye || !m.finished || !m.winner || !m.a || !m.b) continue;
    const loser = m.winner === m.a ? m.b : m.a;
    out[loser] = m.stage === "final" ? "runner_up" : m.stage;
  }
  out[final.winner] = "champion";
  return out;
}
