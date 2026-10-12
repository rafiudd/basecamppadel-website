/**
 * Pure rules for the player profile (no imports, unit-tested with `npm test`): the skill board with
 * "naik" markers, the per-session average, the coach-note filters, and the event history grouping.
 * Every report passed in is a submitted assessment published to the player.
 */

export type SkillKind = "teknik" | "ingame";
export type SkillDef = { key: string; kind: SkillKind; group_label: string; label: string; sort: number };

export type CoachReport = {
  id: string;
  session: { id: string; title: string; session_date: string; venue: string; coach_name: string };
  evaluation: string[];
  next_practice: string[];
  ratings: { skill_key: string; score: number }[];
};

export type SkillScore = { key: string; label: string; score: number | null; delta: number | null };
export type SkillGroup = { label: string; items: SkillScore[] };
export type SkillBoard = { kind: SkillKind; rated: number; total: number; groups: SkillGroup[] };

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Mean of a session's scores to one decimal (the "rata-rata" everywhere), null without scores. */
export function averageScore(ratings: { score: number }[]): number | null {
  return ratings.length ? round1(ratings.reduce((sum, x) => sum + Number(x.score), 0) / ratings.length) : null;
}

/** The coach's free-text notes ("- point" per line, bullets optional) → one string per point. */
export function splitNotes(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-•*]|\d+[.)](?=\s))\s*/, "").trim())
    .filter(Boolean);
}

/** Oldest first; same-day sessions keep their given order. */
export function chronological(reports: CoachReport[]): CoachReport[] {
  return reports
    .map((r, i) => ({ r, i }))
    .sort((a, b) => a.r.session.session_date.localeCompare(b.r.session.session_date) || a.i - b.i)
    .map(({ r }) => r);
}

/**
 * Every skill with its latest score and the change from the score before it (`delta`, only when the
 * skill was rated at least twice). Unrated skills keep `score: null`.
 */
export function skillBoards(skills: SkillDef[], reports: CoachReport[]): SkillBoard[] {
  const history = new Map<string, number[]>();
  for (const r of chronological(reports)) {
    for (const { skill_key, score } of r.ratings) {
      history.set(skill_key, [...(history.get(skill_key) ?? []), Number(score)]);
    }
  }
  return (["teknik", "ingame"] as const).map((kind) => {
    const groups: SkillGroup[] = [];
    let rated = 0;
    const ofKind = skills.filter((s) => s.kind === kind).sort((a, b) => a.sort - b.sort);
    for (const s of ofKind) {
      const scores = history.get(s.key) ?? [];
      const score = scores.at(-1) ?? null;
      const delta = scores.length >= 2 ? round1(scores[scores.length - 1] - scores[scores.length - 2]) : null;
      if (score !== null) rated++;
      let group = groups.at(-1);
      if (!group || group.label !== s.group_label) groups.push((group = { label: s.group_label, items: [] }));
      group.items.push({ key: s.key, label: s.label, score, delta });
    }
    return { kind, rated, total: ofKind.length, groups };
  });
}

export type SessionAverage = { reportId: string; date: string; title: string; avg: number };

/** Average score of each rated session, oldest first (the progress chart). */
export function sessionAverages(reports: CoachReport[]): SessionAverage[] {
  return chronological(reports)
    .filter((r) => r.ratings.length > 0)
    .map((r) => ({
      reportId: r.id,
      date: r.session.session_date,
      title: r.session.title,
      avg: averageScore(r.ratings)!,
    }));
}

/**
 * Per report: its average and the skills that went up versus their previous rating (the "▲" chips on
 * a coach note). The first report rating a skill has nothing to compare with.
 */
export function reportSummaries(skills: SkillDef[], reports: CoachReport[]): Map<string, { average: number | null; rising: { label: string; delta: number }[] }> {
  const label = new Map(skills.map((s) => [s.key, s.label]));
  const last = new Map<string, number>();
  const out = new Map<string, { average: number | null; rising: { label: string; delta: number }[] }>();
  for (const r of chronological(reports)) {
    const rising: { label: string; delta: number }[] = [];
    for (const { skill_key, score } of r.ratings) {
      const prev = last.get(skill_key);
      if (prev !== undefined && score > prev) rising.push({ label: label.get(skill_key) ?? skill_key, delta: round1(score - prev) });
      last.set(skill_key, Number(score));
    }
    out.set(r.id, { average: averageScore(r.ratings), rising });
  }
  return out;
}

// ---------------------------------------------------------------- rapor (D.6)

const SCORE_WORDS = ["Belum bisa", "Mulai bisa", "Lumayan", "Bagus", "Mantap"];

/** 1–5 score → word on the rapor legend; a half step rounds up (3.5 = "Bagus"). */
export function scoreLabel(score: number): string {
  return SCORE_WORDS[Math.min(5, Math.max(1, Math.ceil(score))) - 1];
}

/** Session average → the word under "Nilai rata-rata" (2.8 "Lumayan", 3.8 "Hampir bagus"). */
export function averageLabel(avg: number): string {
  if (avg >= 4.5) return "Mantap";
  if (avg >= 4) return "Bagus";
  if (avg >= 3.5) return "Hampir bagus";
  if (avg >= 2.5) return "Lumayan";
  if (avg >= 1.5) return "Mulai bisa";
  return "Belum bisa";
}

/** "Paling bagus" = every top-scored skill, "Perlu dilatih" = every lowest (none when all are equal). */
export function reportHighlights<T extends { score: number }>(ratings: T[]): { best: T[]; weakest: T[] } {
  if (!ratings.length) return { best: [], weakest: [] };
  const hi = Math.max(...ratings.map((r) => r.score));
  const lo = Math.min(...ratings.map((r) => r.score));
  return { best: ratings.filter((r) => r.score === hi), weakest: hi === lo ? [] : ratings.filter((r) => r.score === lo) };
}

const MONTH_UPPER = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];

/** Same naming as the hand-made rapor: BASECAMP_CLINIC_FITA_5_OKT */
export function raporFileName(name: string, isoDate: string): string {
  const [, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  const who = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "") || "PEMAIN";
  return `BASECAMP_CLINIC_${who}_${d}_${MONTH_UPPER[m - 1]}`;
}

/** Best and weakest skill by latest score (ties: the first in skill order). */
export function strongestAndWeakest(boards: SkillBoard[]): { best: SkillScore | null; weakest: SkillScore | null } {
  const rated = boards.flatMap((b) => b.groups.flatMap((g) => g.items)).filter((i) => i.score !== null);
  if (!rated.length) return { best: null, weakest: null };
  const best = rated.reduce((a, b) => (b.score! > a.score! ? b : a));
  const weakest = rated.reduce((a, b) => (b.score! < a.score! ? b : a));
  return { best, weakest: weakest.key === best.key ? null : weakest };
}

/** Newest first, optionally only one coach and/or one year. */
export function filterReports(reports: CoachReport[], filter: { coach?: string; year?: string }): CoachReport[] {
  return chronological(reports)
    .reverse()
    .filter((r) => (!filter.coach || r.session.coach_name === filter.coach) && (!filter.year || r.session.session_date.startsWith(filter.year)));
}

export function reportFilterOptions(reports: CoachReport[]): { coaches: string[]; years: string[] } {
  const coaches = [...new Set(reports.map((r) => r.session.coach_name).filter(Boolean))].sort();
  const years = [...new Set(reports.map((r) => r.session.session_date.slice(0, 4)))].sort().reverse();
  return { coaches, years };
}

// ---------------------------------------------------------------- event history

export type HistoryRow = {
  id: string;
  created_at: string;
  result: "W" | "L";
  opponent_label: string;
  session_label: string;
  points_delta: number;
  match: {
    event_id: string | null;
    team_a_name: string;
    team_b_name: string;
    team_a_games: number;
    team_b_games: number;
  } | null;
};
export type AwardRow = { event_id: string; stage: string; rank: number | null; points: number };
export type EventRow = { id: string; title: string; type: string; event_date: string | null };

export type EventMatch = { id: string; team: string; opponent: string; score: string | null; result: "W" | "L" };
export type EventEntry = {
  key: string;
  eventId: string | null;
  title: string;
  type: string | null;
  date: string; // yyyy-mm-dd
  points: number;
  award: { stage: string; rank: number | null } | null;
  wins: number;
  losses: number;
  matches: EventMatch[];
};

/** One entry per event the player took part in (matches and/or a final award), newest first. */
export function eventHistory(history: HistoryRow[], awards: AwardRow[], events: EventRow[]): EventEntry[] {
  const eventById = new Map(events.map((e) => [e.id, e]));
  const entries = new Map<string, EventEntry>();
  const entryFor = (eventId: string | null, label: string, createdAt: string) => {
    const key = eventId ?? `label:${label}`;
    let e = entries.get(key);
    if (!e) {
      const ev = eventId ? eventById.get(eventId) : undefined;
      e = {
        key,
        eventId,
        title: ev?.title ?? (label || "Match"),
        type: ev?.type ?? null,
        date: ev?.event_date ?? createdAt.slice(0, 10),
        points: 0,
        award: null,
        wins: 0,
        losses: 0,
        matches: [],
      };
      entries.set(key, e);
    }
    return e;
  };

  for (const h of [...history].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const e = entryFor(h.match?.event_id ?? null, h.session_label, h.created_at);
    e.points += h.points_delta;
    if (h.result === "W") e.wins++;
    else e.losses++;
    const m = h.match;
    const onA = m ? m.team_b_name === h.opponent_label : true;
    const games = m && m.team_a_games + m.team_b_games > 0 ? (onA ? [m.team_a_games, m.team_b_games] : [m.team_b_games, m.team_a_games]) : null;
    e.matches.push({
      id: h.id,
      team: m ? (onA ? m.team_a_name : m.team_b_name) : "",
      opponent: h.opponent_label,
      score: games ? `${games[0]}–${games[1]}` : null,
      result: h.result,
    });
  }
  for (const a of awards) {
    const e = entryFor(a.event_id, "", eventById.get(a.event_id)?.event_date ?? "");
    e.points += a.points;
    e.award = { stage: a.stage, rank: a.rank };
  }
  return [...entries.values()].sort((a, b) => b.date.localeCompare(a.date));
}
