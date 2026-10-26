/**
 * Pure rules for the player profile (no imports, unit-tested with `npm test`): the skill board with
 * "naik" markers, the per-session average, the coach-note filters, and the event history grouping.
 * Every report passed in is a submitted assessment published to the player.
 */

export type SkillKind = "teknik" | "ingame";
export type SkillDef = { key: string; kind: SkillKind; group_label: string; label: string; sort: number };

export type CoachReport = {
  id: string;
  session: {
    id: string;
    title: string;
    session_date: string;
    venue: string;
    coach_name: string; // the coach who sent the assessment
    group_coach_name?: string; // the coach of the player's group, when it is someone else
    event_id?: string | null;
  };
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
    // one group per category (Master Teknik appends new skills at the end, so a category's skills
    // need not be next to each other); categories in the order of their first skill
    const groups = new Map<string, SkillGroup>();
    let rated = 0;
    const ofKind = skills.filter((s) => s.kind === kind).sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label));
    for (const s of ofKind) {
      const scores = history.get(s.key) ?? [];
      const score = scores.at(-1) ?? null;
      const delta = scores.length >= 2 ? round1(scores[scores.length - 1] - scores[scores.length - 2]) : null;
      if (score !== null) rated++;
      const label = s.group_label.trim() || "Lainnya";
      if (!groups.has(label)) groups.set(label, { label, items: [] });
      groups.get(label)!.items.push({ key: s.key, label: s.label, score, delta });
    }
    return { kind, rated, total: ofKind.length, groups: [...groups.values()] };
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

/** The next coaching session on the profile ("Sesi berikutnya"); `href` is where to sign up. */
export type NextSession = { title: string; date: string; venue: string; href: string };

export type CategoryAverage = { label: string; now: number; first: number | null };
export type SkillMap = { axes: CategoryAverage[]; nowDate: string | null; firstDate: string | null };

/**
 * "Peta skill": per category rated at least once (board order: teknik, then in-game), the average of
 * each skill's latest score (`now`) and of the first rated session's scores (`first`; null with a
 * single rated session, or when that session didn't touch the category). `boards` = skillBoards().
 */
export function categoryAverages(boards: SkillBoard[], reports: CoachReport[]): SkillMap {
  const rated = chronological(reports).filter((r) => r.ratings.length > 0);
  const first = rated.length >= 2 ? new Map(rated[0].ratings.map((x) => [x.skill_key, Number(x.score)])) : null;
  const axes = boards.flatMap((b) =>
    b.groups.flatMap((g) => {
      const now = averageScore(g.items.flatMap((i) => (i.score === null ? [] : [{ score: i.score }])));
      if (now === null) return [];
      const before = first ? g.items.flatMap((i) => (first.has(i.key) ? [{ score: first.get(i.key)! }] : [])) : [];
      return [{ label: g.label, now, first: averageScore(before) }];
    }),
  );
  return {
    axes,
    nowDate: rated.at(-1)?.session.session_date ?? null,
    firstDate: first ? rated[0].session.session_date : null,
  };
}

/**
 * "Sering dibahas coach": skills scored under 3 in the most sessions (ties: lowest latest score, then
 * board order), with how many of the rated sessions that was. `boards` = skillBoards().
 */
export function recurringWeakSkills(
  boards: SkillBoard[],
  reports: CoachReport[],
  max = 3,
): { label: string; sessions: number; total: number }[] {
  const rated = reports.filter((r) => r.ratings.length > 0);
  return boards
    .flatMap((b) => b.groups.flatMap((g) => g.items))
    .map((item, i) => ({ item, i, sessions: rated.filter((r) => r.ratings.some((x) => x.skill_key === item.key && Number(x.score) < 3)).length }))
    .filter((x) => x.sessions > 0)
    .sort((a, b) => b.sessions - a.sessions || (a.item.score ?? 5) - (b.item.score ?? 5) || a.i - b.i)
    .slice(0, max)
    .map((x) => ({ label: x.item.label, sessions: x.sessions, total: rated.length }));
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

/**
 * The line above the name on the rapor, from the session title ("Coaching Clinic · Battle #01").
 * A date part the admin typed into the title is dropped, since the rapor shows the date already.
 */
export function raporEventLabel(title: string): string {
  const label = title
    .split("·")
    .map((p) => p.trim())
    .filter((p) => p && !/\d{1,2}\s+\p{L}{3,}\.?\s+\d{4}/u.test(p))
    .join(" · ");
  return (label || "Mabar with Coach").toUpperCase();
}

/**
 * The rapor's place in the player's sessions: `session` is its number (1 = first sent rapor) and
 * `previous` the latest earlier rapor with scores, the one a second-or-later rapor compares with.
 */
export function previousReport(reports: CoachReport[], reportId: string): { session: number; previous: CoachReport | null; previousSession: number } {
  const list = chronological(reports);
  const idx = list.findIndex((r) => r.id === reportId);
  for (let i = idx - 1; i >= 0; i--) {
    if (list[i].ratings.length) return { session: idx + 1, previous: list[i], previousSession: i + 1 };
  }
  return { session: idx + 1, previous: null, previousSession: 0 };
}

export type SkillChange = { label: string; delta: number | null }; // null: not rated in the previous session ("BARU")

/** "A, B, C dan 4 lainnya": a long skill list would fill the notes card. */
const listJoin = (labels: string[]) => (labels.length > 3 ? `${labels.slice(0, 3).join(", ")} dan ${labels.length - 3} lainnya` : labels.join(", "));

/**
 * The "Progres vs sesi N" counts ("2 tetap · 2 turun") and the matching evaluation point. Skills new
 * this session are left out of both.
 */
export function progressSummary(changes: SkillChange[], previousSession: number): { summary: string; note: string } {
  const up = changes.filter((c) => c.delta !== null && c.delta > 0).map((c) => c.label);
  const down = changes.filter((c) => c.delta !== null && c.delta < 0).map((c) => c.label);
  const same = changes.filter((c) => c.delta === 0).length;
  const summary = [up.length && `${up.length} naik`, same && `${same} tetap`, down.length && `${down.length} turun`].filter(Boolean).join(" · ");
  const vs = `sesi ${previousSession}`;
  let note = "";
  if (up.length && down.length) note = `naik dari ${vs} di ${listJoin(up)}. Yang turun (${listJoin(down)}) jadi fokus latihan berikutnya.`;
  else if (up.length) note = `naik dari ${vs} di ${listJoin(up)}. Pertahankan!`;
  else if (down.length) note = `${listJoin(down)} turun dari ${vs}, jadi ini fokus latihan berikutnya.`;
  else if (same) note = `nilainya sama dengan ${vs}. Saatnya naik level di sesi berikutnya.`;
  return { summary, note };
}

/**
 * At most `max` bars fit the progress chart: every skill when they fit, else the biggest changes
 * first, then unchanged, then new ones, shown in skill order.
 */
export function chartChanges<T extends SkillChange>(changes: T[], max = 10): T[] {
  if (changes.length <= max) return changes;
  const weight = (c: SkillChange) => (c.delta ? 1 + Math.abs(c.delta) : c.delta === 0 ? 0.5 : 0);
  const keep = new Set([...changes].sort((a, b) => weight(b) - weight(a)).slice(0, max));
  return changes.filter((c) => keep.has(c));
}

/** What a second-or-later rapor adds: the session badge, the progress chart and two evaluation points. */
export type RaporCompare = {
  session: number; // this rapor's number, the "SESI 2" badge
  previousSession: number;
  summary: string; // "2 tetap · 2 turun"
  chart: SkillChange[];
  notes: { lead: string; text: string }[]; // "Paling kuat:", "Progres:" after the coach's evaluation
};

/**
 * The comparison with the previous session, or null for a first rapor (no earlier rapor with scores)
 * and for one without scores. `rated` is in skill order, `prev` the previous session's score.
 */
export function raporCompare(
  rated: { label: string; score: number; prev: number | null }[],
  position: ReturnType<typeof previousReport>,
): RaporCompare | null {
  if (!position.previous || !rated.length) return null;
  const changes = rated.map((r) => ({ label: r.label, delta: r.prev === null ? null : round1(r.score - r.prev) }));
  const { summary, note } = progressSummary(changes, position.previousSession);
  const { best } = reportHighlights(rated);
  return {
    session: position.session,
    previousSession: position.previousSession,
    summary,
    chart: chartChanges(changes),
    notes: [
      { lead: "Paling kuat:", text: `${best.map((r) => r.label).join(", ")} (${best[0].score}). Pertahankan dan jadikan senjata utama.` },
      ...(note ? [{ lead: "Progres:", text: note }] : []),
    ],
  };
}

/** Coach names for the rapor: the one who rated first, then the group's coach (no duplicates). */
export function raporCoaches(session: CoachReport["session"]): string[] {
  return [...new Set([session.coach_name, session.group_coach_name ?? ""].map((n) => n.trim()).filter(Boolean))];
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
    section: string | null; // "Grup B", "Semifinal · SF1", "Ronde 2"
  } | null;
};
export type AwardRow = { event_id: string; stage: string; rank: number | null; points: number; created_at?: string };
export type EventRow = { id: string; title: string; type: string; event_date: string | null };

export type EventMatch = {
  id: string;
  date: string; // created_at
  team: string;
  partner: string; // the player's teammate(s), "" when unknown
  opponent: string;
  section: string | null;
  score: string | null;
  result: "W" | "L";
};
export type EventKind = "mabar" | "kompetisi" | "coaching" | null;
export type EventEntry = {
  key: string;
  eventId: string | null;
  title: string;
  kind: EventKind;
  date: string; // yyyy-mm-dd
  points: number;
  award: { stage: string; rank: number | null } | null;
  reportId: string | null; // a coaching session with a sent rapor
  wins: number;
  losses: number;
  matches: EventMatch[];
};

/**
 * Teammate(s) from a team name like "Nadia / Salsa": every name that isn't the player's (matched on
 * the full name or its first word, case-insensitive). The whole team name when the player isn't in it.
 */
export function partnerOf(team: string, ownName: string): string {
  const names = team.split("/").map((n) => n.trim()).filter(Boolean);
  const own = ownName.trim().toLowerCase();
  const first = own.split(/\s+/)[0];
  const others = names.filter((n) => n.toLowerCase() !== own && n.toLowerCase() !== first);
  return others.length < names.length ? others.join(" / ") : team;
}

/**
 * One entry per event the player took part in (matches and/or a final award), plus each sent
 * coaching session (merged into its event when it belongs to one), newest first.
 */
export function eventHistory(
  history: HistoryRow[],
  awards: AwardRow[],
  events: EventRow[],
  opts: { ownName?: string; coaching?: Pick<CoachReport, "id" | "session">[] } = {},
): EventEntry[] {
  const eventById = new Map(events.map((e) => [e.id, e]));
  const entries = new Map<string, EventEntry>();
  const entryFor = (eventId: string | null, label: string, date: string, key = eventId ?? `label:${label}`) => {
    let e = entries.get(key);
    if (!e) {
      const ev = eventId ? eventById.get(eventId) : undefined;
      e = {
        key,
        eventId,
        // an event the player can no longer read still reads as one, not as a match
        title: ev?.title ?? (label || (eventId ? "Event" : "Match")),
        kind: ev?.type === "mabar" || ev?.type === "kompetisi" ? ev.type : null,
        date: ev?.event_date ?? date.slice(0, 10),
        points: 0,
        award: null,
        reportId: null,
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
    const team = m ? (onA ? m.team_a_name : m.team_b_name) : "";
    e.matches.push({
      id: h.id,
      date: h.created_at,
      team,
      partner: team && opts.ownName ? partnerOf(team, opts.ownName) : "",
      opponent: h.opponent_label,
      section: m?.section ?? null,
      score: games ? `${games[0]}–${games[1]}` : null,
      result: h.result,
    });
  }
  for (const a of awards) {
    const e = entryFor(a.event_id, "", eventById.get(a.event_id)?.event_date ?? a.created_at ?? "");
    e.points += a.points;
    e.award = { stage: a.stage, rank: a.rank };
  }
  for (const r of opts.coaching ?? []) {
    const eventId = r.session.event_id ?? null;
    // a session outside any event is its own entry (two "Mabar with Coach" sessions stay separate)
    const e = entryFor(eventId, r.session.title, r.session.session_date, eventId ?? `coaching:${r.id}`);
    e.kind = "coaching";
    e.reportId = r.id;
  }
  return [...entries.values()].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Every match, labelled with its event ("Battle #01 · Grup B"): newest event first, and within an
 * event in the order they were played (as in the design).
 */
export function matchHistory(entries: EventEntry[]): (EventMatch & { label: string })[] {
  return entries.flatMap((e) => e.matches.map((m) => ({ ...m, label: [e.title, m.section].filter(Boolean).join(" · ") })));
}

// ---------------------------------------------------------------- notifikasi rapor
export function normalizeWhatsAppNumber(phone: string): string {
  let clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("0")) {
    clean = "62" + clean.slice(1);
  }
  return clean;
}

export function generateCoachingReportNotificationMessage({
  evaluation,
  nextPractice,
}: {
  evaluation?: string | null;
  nextPractice?: string | null;
}): string {
  const parts: string[] = ["Halo! Catatan latihan dari coach sudah keluar nih 🎾\n"];

  const cleanEval = (evaluation || "").trim();
  if (cleanEval) {
    parts.push(`*Evaluasi:*\n${cleanEval}\n`);
  }

  const cleanPractice = (nextPractice || "").trim();
  if (cleanPractice) {
    parts.push(`*Latihan berikutnya:*\n${cleanPractice}\n`);
  }

  parts.push(
    "Untuk detail rapor lengkap dan perkembangan skill kamu, silakan cek di:\nhttps://www.basecamppadel.id/akun?tab=notes\n\nSampai ketemu di lapangan!"
  );

  return parts.join("\n").trim();
}

export function generateCoachingWhatsAppUrl(phone: string, message: string): string {
  const clean = normalizeWhatsAppNumber(phone);
  const encoded = encodeURIComponent(message);
  return clean ? `https://wa.me/${clean}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

export function generateCoachingMailtoUrl(email: string, message: string): string {
  const cleanEmail = email.trim();
  const subject = encodeURIComponent("Catatan Coaching & Rapor — Basecamp Padel");
  const body = encodeURIComponent(message);
  return cleanEmail ? `mailto:${cleanEmail}?subject=${subject}&body=${body}` : `mailto:?subject=${subject}&body=${body}`;
}
