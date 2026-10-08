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
 * Round-robin one virtual round at a time from several queues (one per circle-method virtual round),
 * so the real schedule doesn't run through queue 1 before touching queue 2 — every matchup still
 * appears exactly once, just spread across the real rounds instead of clustered by where it came from.
 */
function interleave<T>(queues: T[][]): T[] {
  const out: T[] = [];
  const left = queues.map((q) => [...q]);
  let remaining = left.reduce((s, q) => s + q.length, 0);
  for (let i = 0; remaining > 0; i++) {
    const q = left[i % left.length];
    if (q.length) {
      out.push(q.shift()!);
      remaining--;
    }
  }
  return out;
}

/**
 * Americano, whole schedule up front. The circle method already guarantees every player partners
 * every other exactly once across its virtual rounds; those partnerships are flattened (interleaved,
 * not just concatenated, so no single stretch of real rounds is dominated by one virtual round) and
 * then matched up two-at-a-time (minimizing repeat opponents) into courts-sized real rounds. However
 * many real rounds that takes is exactly how many get returned — courts never cause a partnership to
 * be dropped, only to take more rounds to get through.
 */
export function americanoSchedule(playerIds: string[], courts: number, seed = 0): PlannedRound<[string, string]>[] {
  if (playerIds.length < 4) return [];
  const queues = circleRounds(seededShuffle(playerIds, seed)).map((round) => round.filter((p): p is [string, string] => p[0] !== null && p[1] !== null));
  const partnerPairs = interleave(queues);

  // Two partnerships can only share a court if they don't share a player (otherwise someone would be
  // facing their own partner, or playing both sides at once). A pair with no valid opponent left
  // right now goes to the back of the queue and gets retried once others have been matched off.
  const opponents = new Map<string, number>();
  const matchups: Court<[string, string]>[] = [];
  const left = [...partnerPairs];
  let stalled = 0;
  while (left.length >= 2 && stalled < left.length) {
    const a = left.shift()!;
    const seen = (b: [string, string]) => a.reduce((s, x) => s + b.reduce((t, y) => t + (opponents.get(key(x, y)) ?? 0), 0), 0);
    let best = -1;
    for (let i = 0; i < left.length; i++) {
      if (left[i].some((p) => a.includes(p))) continue;
      if (best === -1 || seen(left[i]) < seen(left[best])) best = i;
    }
    if (best === -1) {
      left.push(a);
      stalled++;
      continue;
    }
    const b = left.splice(best, 1)[0];
    stalled = 0;
    for (const x of a) for (const y of b) bump(opponents, key(x, y));
    matchups.push({ a, b });
  }

  return packRounds(
    matchups.map((m) => ({ game: m, units: [...m.a, ...m.b] })),
    Math.max(1, courts),
    playerIds,
    seed,
  );
}

/**
 * Team Americano (fixed partner): every pair of teams meets exactly once, period — the circle method
 * already produces that as virtual rounds; they're interleaved (so matchups spread across the whole
 * schedule instead of clustering) and then sliced into courts-sized real rounds. With fewer courts
 * than team-pairs-per-virtual-round, this just takes more real rounds — nothing is ever dropped, so
 * every team still plays every other exactly once by the end.
 */
export function teamRoundRobin(teamKeys: string[], courts: number, seed = 0): PlannedRound<string>[] {
  if (teamKeys.length < 2) return [];
  const queues = circleRounds(seededShuffle(teamKeys, seed)).map((round) => round.filter((p): p is [string, string] => p[0] !== null && p[1] !== null));
  const games = interleave(queues);

  return packRounds(
    games.map(([a, b]) => ({ game: { a, b }, units: [a, b] })),
    Math.max(1, courts),
    teamKeys,
    seed,
  );
}

type Game<T> = { game: Court<T>; units: string[] };

/** A unit shouldn't play or rest more than this many real rounds in a row. */
const MAX_REST_STREAK = 3;

/**
 * Pack games into rounds one at a time: each round, rank the still-unscheduled games by how far
 * behind pace their units are (the fraction of a unit's total games it *should* have played by now,
 * assuming the whole thing takes `idealRounds` — the courts-bound lower limit) and fill courts from
 * that ranking, skipping only what would double-book a unit this round. This is a reasonable starting
 * point — nothing is ever dropped, and it already leans away from clustering — but greedy local
 * ranking alone can't see far enough ahead to guarantee no one ends up playing or resting too many
 * rounds in a row; `balanceStreaks` below fixes that with a second pass over the whole schedule.
 */
function buildInitialRounds<T>(games: Game<T>[], perRound: number, allUnits: string[]): Game<T>[][] {
  let remaining = games;
  const rounds: Game<T>[][] = [];

  const gamesCount = new Map(allUnits.map((u) => [u, 0]));
  for (const g of games) for (const u of g.units) gamesCount.set(u, (gamesCount.get(u) ?? 0) + 1);
  const idealRounds = Math.max(1, Math.ceil(games.length / perRound));
  const played = new Map(allUnits.map((u) => [u, 0]));

  let roundNo = 0;
  while (remaining.length) {
    const pace = (u: string) => ((roundNo + 1) / idealRounds) * (gamesCount.get(u) ?? 0) - (played.get(u) ?? 0);
    const ranked = remaining
      .map((g, i) => ({ g, i, need: Math.max(...g.units.map(pace)) }))
      .sort((x, y) => y.need - x.need || x.i - y.i);

    const used = new Set<string>();
    const round: Game<T>[] = [];
    const takenIdx = new Set<number>();
    for (const { g, i } of ranked) {
      if (round.length >= perRound) break;
      if (g.units.some((u) => used.has(u))) continue;
      round.push(g);
      for (const u of g.units) used.add(u);
      takenIdx.add(i);
    }
    remaining = remaining.filter((_, i) => !takenIdx.has(i));
    for (const u of allUnits) if (used.has(u)) played.set(u, (played.get(u) ?? 0) + 1);
    rounds.push(round);
    roundNo++;
  }
  return rounds;
}

/** Longest run of consecutive `true`s in a boolean sequence. */
function longestRun(xs: boolean[]): number {
  let best = 0;
  let run = 0;
  for (const x of xs) {
    run = x ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/**
 * How unbalanced a schedule is: for every unit, how far its longest play streak and longest rest
 * streak exceed a comfortable cap, squared so one bad streak of 6 is penalized far more than two of 3
 * — pushes the search to spread the pain out rather than just move it to a different unit.
 */
function streakCost<T>(rounds: Game<T>[][], allUnits: string[], cap: number): number {
  let cost = 0;
  for (const u of allUnits) {
    const played = rounds.map((r) => r.some((g) => g.units.includes(u)));
    const playStreak = longestRun(played);
    const restStreak = longestRun(played.map((p) => !p));
    cost += Math.max(0, playStreak - cap) ** 2 + Math.max(0, restStreak - cap) ** 2;
  }
  return cost;
}

/**
 * Local search: starting from the pace-greedy schedule, repeatedly try swapping two games that
 * landed in different rounds (so a unit stuck with a long streak gets a chance to trade into a round
 * further away from its other games) and keep the swap only when it doesn't double-book a unit in
 * either round and doesn't make the overall streak cost worse. Greedy round-by-round packing can't
 * see the whole schedule at once, so it can still leave a unit's games front-loaded (finishing all of
 * them well before the schedule ends, then resting out the entire tail) — reshuffling after the fact
 * is what actually catches that, instead of trying to out-think it with an even fancier per-round rule.
 */
function balanceStreaks<T>(rounds: Game<T>[][], allUnits: string[], cap: number, seed: number): Game<T>[][] {
  const next = rounds.map((r) => [...r]);
  const rand = rng(seed + 1);
  let cost = streakCost(next, allUnits, cap);

  for (let iter = 0; cost > 0 && iter < 4000; iter++) {
    const r1 = Math.floor(rand() * next.length);
    const r2 = Math.floor(rand() * next.length);
    if (r1 === r2 || !next[r1].length || !next[r2].length) continue;
    const i1 = Math.floor(rand() * next[r1].length);
    const i2 = Math.floor(rand() * next[r2].length);
    const g1 = next[r1][i1];
    const g2 = next[r2][i2];

    const clashes = (round: Game<T>[], at: number, incoming: Game<T>) =>
      round.some((g, idx) => idx !== at && g.units.some((u) => incoming.units.includes(u)));
    if (clashes(next[r1], i1, g2) || clashes(next[r2], i2, g1)) continue;

    next[r1][i1] = g2;
    next[r2][i2] = g1;
    const newCost = streakCost(next, allUnits, cap);
    if (newCost <= cost) {
      cost = newCost;
    } else {
      next[r1][i1] = g1;
      next[r2][i2] = g2;
    }
  }
  return next;
}

/**
 * Build one real round at a time (not "drop each game wherever it fits" — that packs whoever's games
 * happen to come first in the list into early rounds and leaves them resting a long stretch once
 * their games run out, and nothing enforces an even spread either): a pace-aware greedy pass gets a
 * decent first cut, then a local-search pass swaps games between rounds to flatten out any remaining
 * streaks it couldn't see coming.
 */
function packRounds<T>(games: Game<T>[], perRound: number, allUnits: string[], seed = 0): PlannedRound<T>[] {
  const initial = buildInitialRounds(games, perRound, allUnits);
  const balanced = balanceStreaks(initial, allUnits, MAX_REST_STREAK, seed);
  return balanced.map((round) => ({ courts: round.map((g) => g.game), resting: allUnits.filter((u) => !round.some((g) => g.units.includes(u))) }));
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
 * How many real rounds a full Americano cycle takes with `units` players (or pairs when `fixed`) on
 * `courts` courts: every one of the `units*(units-1)/2` pairings happens exactly once — nothing is
 * ever dropped for lack of courts, it just takes more rounds. Free Americano pairs up two partnerships
 * per match, so its match count (and therefore rounds) is roughly half the pairing count.
 */
export function americanoCoverage(units: number, courts: number, fixed: boolean) {
  if (units < (fixed ? 2 : 4)) return { cycle: 0, total: 0 };
  const total = (units * (units - 1)) / 2;
  const matches = fixed ? total : Math.ceil(total / 2);
  return { cycle: Math.max(1, Math.ceil(matches / Math.max(1, courts))), total };
}
