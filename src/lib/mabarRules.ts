/**
 * Pure mabar rules (no imports, unit-tested with `npm test`): Americano schedules, team round robin,
 * and the mabar table. See the "Feature event mabar" task for the rules.
 */

export type Court<T> = { a: T; b: T };
export type PlannedRound<T> = { courts: Court<T>[]; resting: string[] };

/** Small deterministic PRNG so a schedule is reproducible from its seed. */
function rng(seed: number) {
  let s = (seed * 7919 + 13) % 233280;
  return () => ((s = (s * 9301 + 49297) % 233280), s / 233280);
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rand = rng(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Circle method: n-1 rounds of n/2 pairs, every pair exactly once. `null` pads an odd count. */
function circleRounds<T>(items: T[]): [T | null, T | null][][] {
  const list: (T | null)[] = [...items];
  if (list.length % 2) list.push(null);
  const n = list.length;
  const rounds: [T | null, T | null][][] = [];
  for (let r = 0; r < n - 1; r++) {
    rounds.push(Array.from({ length: n / 2 }, (_, i) => [list[i], list[n - 1 - i]] as [T | null, T | null]));
    list.splice(1, 0, list.pop()!);
  }
  return rounds;
}

const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

/**
 * Americano, whole schedule up front. Partners rotate with the circle method, so within one full
 * cycle (players−1 rounds) nobody partners the same player twice. Pairs that don't fit on the courts
 * rest (those with the most rests so far play first), and the playing pairs are matched to spread
 * opponents evenly.
 */
export function americanoSchedule(playerIds: string[], courts: number, rounds: number, seed = 0): PlannedRound<[string, string]>[] {
  if (playerIds.length < 4) return [];
  const base = circleRounds(seededShuffle(playerIds, seed));
  const rests = new Map(playerIds.map((p) => [p, 0]));
  const opponents = new Map<string, number>();
  const out: PlannedRound<[string, string]>[] = [];

  for (let r = 0; r < rounds; r++) {
    const pairs = base[r % base.length].filter((p): p is [string, string] => p[0] !== null && p[1] !== null);
    const resting = base[r % base.length].flat().filter((p): p is string => p !== null && !pairs.some((q) => q.includes(p)));
    const fit = Math.min(Math.max(1, courts) * 2, Math.floor(pairs.length / 2) * 2);
    const byNeed = [...pairs].sort((x, y) => rests.get(y[0])! + rests.get(y[1])! - (rests.get(x[0])! + rests.get(x[1])!));
    const playing = byNeed.slice(0, fit);
    resting.push(...byNeed.slice(fit).flat());

    const matchups: Court<[string, string]>[] = [];
    const left = [...playing];
    while (left.length >= 2) {
      const a = left.shift()!;
      const seen = (b: [string, string]) => a.reduce((s, x) => s + b.reduce((t, y) => t + (opponents.get(key(x, y)) ?? 0), 0), 0);
      let best = 0;
      for (let i = 1; i < left.length; i++) if (seen(left[i]) < seen(left[best])) best = i;
      const b = left.splice(best, 1)[0];
      for (const x of a) for (const y of b) bump(opponents, key(x, y));
      matchups.push({ a, b });
    }
    for (const p of resting) rests.set(p, rests.get(p)! + 1);
    out.push({ courts: matchups, resting });
  }
  return out;
}

/**
 * Team Americano (fixed partner): round robin between teams, every pair of teams once per cycle.
 * An odd team count gives one bye per round; extra matches beyond the courts wait, teams that
 * rested most play first.
 */
export function teamRoundRobin(teamKeys: string[], courts: number, rounds: number, seed = 0): PlannedRound<string>[] {
  if (teamKeys.length < 2) return [];
  const base = circleRounds(seededShuffle(teamKeys, seed));
  const rests = new Map(teamKeys.map((t) => [t, 0]));
  const out: PlannedRound<string>[] = [];
  for (let r = 0; r < rounds; r++) {
    const all = base[r % base.length];
    const games = all.filter((p): p is [string, string] => p[0] !== null && p[1] !== null);
    const resting = all.flat().filter((t): t is string => t !== null && !games.some((g) => g.includes(t)));
    const byNeed = [...games].sort((x, y) => rests.get(y[0])! + rests.get(y[1])! - (rests.get(x[0])! + rests.get(x[1])!));
    const playing = byNeed.slice(0, Math.max(1, courts));
    resting.push(...byNeed.slice(playing.length).flat());
    for (const t of resting) rests.set(t, rests.get(t)! + 1);
    out.push({ courts: playing.map(([a, b]) => ({ a, b })), resting });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

/** One finished court: the unit keys on each side (players, or one team key) and their games. */
export type MabarResult = { a: string[]; b: string[]; ga: number; gb: number };

export type MabarStanding = {
  key: string;
  played: number;
  games: number;
  /** Games per match; the table sorts by this instead of `games` when not everyone played as often. */
  avg: number;
  wins: number;
  draws: number;
  losses: number;
  diff: number;
  rank: number;
};

/** Stable pseudo-random number per (seed, key): the "undian" tiebreak. */
function lottery(seed: number, k: string) {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < k.length; i++) {
    h ^= k.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Mabar table. Points = games won by your side. Order: total games (or games per match when the
 * number of matches differs) → wins → game difference → head-to-head (only when exactly 2 tie) →
 * lottery. Ranks are 1..n without gaps.
 */
export function mabarStandings(keys: string[], results: MabarResult[], seed = 0): MabarStanding[] {
  const rows = new Map(keys.map((k) => [k, { key: k, played: 0, games: 0, avg: 0, wins: 0, draws: 0, losses: 0, diff: 0, rank: 0 }]));
  for (const r of results) {
    for (const [side, own, other] of [[r.a, r.ga, r.gb], [r.b, r.gb, r.ga]] as const) {
      for (const k of side) {
        const row = rows.get(k);
        if (!row) continue;
        row.played++;
        row.games += own;
        row.diff += own - other;
        if (own > other) row.wins++;
        else if (own < other) row.losses++;
        else row.draws++;
      }
    }
  }
  const list = [...rows.values()];
  for (const r of list) r.avg = r.played ? r.games / r.played : 0;
  const uneven = new Set(list.filter((r) => r.played > 0).map((r) => r.played)).size > 1;
  const score = (r: MabarStanding) => (uneven ? r.avg : r.games);

  /** Games x scored minus games y scored in matches where they were on opposite sides. */
  const headToHead = (x: string, y: string) =>
    results.reduce((s, r) => {
      if (r.a.includes(x) && r.b.includes(y)) return s + r.ga - r.gb;
      if (r.b.includes(x) && r.a.includes(y)) return s + r.gb - r.ga;
      return s;
    }, 0);

  const sorted = list.sort((x, y) => score(y) - score(x) || y.wins - x.wins || y.diff - x.diff);
  const out: MabarStanding[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    const same = (r: MabarStanding) => score(r) === score(sorted[i]) && r.wins === sorted[i].wins && r.diff === sorted[i].diff;
    while (j < sorted.length && same(sorted[j])) j++;
    const block = sorted.slice(i, j);
    const h2h = block.length === 2 ? headToHead(block[0].key, block[1].key) : 0; // > 0: block[0] won it
    const first = block[0].key;
    block.sort((x, y) => (h2h !== 0 ? (x.key === first ? -h2h : h2h) : 0) || lottery(seed, x.key) - lottery(seed, y.key));
    out.push(...block);
    i = j;
  }
  out.forEach((r, i) => (r.rank = i + 1));
  return out;
}

/**
 * What an Americano schedule covers with `units` players (or pairs when `fixed`) on `courts` courts:
 * rounds for one full cycle, and how many partnerships (or team matchups) a cycle can't fit because
 * there are fewer courts than games per round.
 */
export function americanoCoverage(units: number, courts: number, fixed: boolean) {
  const cycle = units % 2 ? units : units - 1;
  const perRound = Math.floor(units / 2); // partner pairs (free) or team matchups (fixed) per round
  const playable = fixed ? Math.min(Math.max(1, courts), perRound) : Math.min(Math.max(1, courts) * 2, Math.floor(perRound / 2) * 2);
  return { cycle: Math.max(0, cycle), total: (units * (units - 1)) / 2, missedPerCycle: Math.max(0, (perRound - playable) * cycle) };
}
