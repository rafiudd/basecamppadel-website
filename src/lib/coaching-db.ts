import type { Document } from "mongodb";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/mongodb";
import { normalizeDoc } from "@/lib/server/mongo/utils";
import type {
  Coach,
  CoachingAssessment,
  CoachingGroup,
  CoachingSession,
  CoachingSkill,
  Player,
} from "@/lib/database.types";
import {
  computePlayerLevel,
  computeScoreDelta,
  deriveSessionStatus,
  SESSION_TABS,
  TAB_STATUS,
  type PlayerLevelName,
  type SessionListQuery,
  type SessionSort,
  type SessionStatus,
  type SessionTab,
} from "./coaching";

export interface CoachingSessionSummary extends CoachingSession {
  totalPlayers: number;
  ratedPlayers: number;
  draftPlayers: number;
  submittedPlayers: number;
  coaches: Array<{ id: string; name: string }>;
}

export interface SessionPlayerItem {
  player: Player;
  group: CoachingGroup | null;
  coach: Coach | null;
  assessment: CoachingAssessment | null;
  status: "unrated" | "draft" | "submitted";
  previousScores: Record<string, number>;
  previousNote: { evaluation: string; nextPractice: string; sessionTitle: string; sessionDate: string } | null;
  computedLevel: {
    level: PlayerLevelName;
    color: string;
    averageScore: number | null;
    rawLevel: PlayerLevelName;
    isOverridden: boolean;
    overrideReason?: string;
    cappedByMabar: boolean;
  };
  email?: string | null;
}

export interface SessionFullData {
  session: CoachingSession;
  groups: CoachingGroup[];
  coaches: Coach[];
  skills: CoachingSkill[];
  players: SessionPlayerItem[];
  progress: {
    total: number;
    rated: number;
    draft: number;
    submitted: number;
  };
}

// ------------------------------------------------------------- Skills
export async function getCoachingSkills(onlyActive = false): Promise<CoachingSkill[]> {
  const supabase = await createClient();
  let q = supabase
    .from("coaching_skills")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (onlyActive) {
    q = q.eq("active", true);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ------------------------------------------------------------- Coaches
export async function getCoaches(): Promise<Coach[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coaches")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ------------------------------------------------------------- Sessions
export const SESSIONS_PAGE_SIZE = 15;

/** Number of coaching sessions per status tab — counted in the database, nothing loaded. */
export async function countCoachingSessionsByStatus(): Promise<Record<SessionTab, number>> {
  const supabase = await createClient();
  const counts = await Promise.all(
    SESSION_TABS.map((t) =>
      supabase.from("coaching_sessions").select("id", { count: "exact", head: true }).eq("status", TAB_STATUS[t]),
    ),
  );
  return Object.fromEntries(SESSION_TABS.map((t, i) => [t, counts[i].count ?? 0])) as Record<SessionTab, number>;
}

/** One session with its progress totals and assigned coaches, or null when it doesn't exist. */
export async function getCoachingSessionSummary(sessionId: string): Promise<CoachingSessionSummary | null> {
  const supabase = await createClient();
  const { data: session } = await supabase.from("coaching_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!session) return null;
  const [summary] = await summarizeSessions(supabase, [session]);
  return summary;
}

/**
 * One page of the coaching session list for a status tab: search (title / venue), sort and paging
 * all run in one MongoDB aggregation, and the per-session totals are loaded only for the sessions on
 * this page — the list no longer pulls every session (plus all their players and assessments).
 * Text sorts compare lower-cased keys so "agil" and "Agil" sort together; the participant sort
 * counts each session's players inside the aggregation (only when that sort is picked).
 */
export async function getCoachingSessionsPage(
  status: SessionStatus,
  query: SessionListQuery,
): Promise<{ rows: CoachingSessionSummary[]; total: number; page: number; totalPages: number }> {
  const db = await getDb();
  const sessionsColl = db.collection("coaching_sessions");

  const match: Document = { status };
  const term = query.q.trim();
  if (term) {
    const rx = { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    match.$or = [{ title: rx }, { venue_name: rx }];
  }

  const total = await sessionsColl.countDocuments(match);
  const totalPages = Math.max(1, Math.ceil(total / SESSIONS_PAGE_SIZE));
  const page = Math.min(query.page, totalPages);
  if (total === 0) return { rows: [], total, page, totalPages };

  const dir = query.dir === "asc" ? 1 : -1;
  const newestFirst = { session_date: -1, created_at: -1, _id: 1 } as const;
  const sortKey: Record<SessionSort, Record<string, 1 | -1>> = {
    date: { session_date: dir, created_at: dir, _id: 1 },
    title: { _titleKey: dir, ...newestFirst },
    venue: { _venueKey: dir, ...newestFirst },
    participants: { _players: dir, ...newestFirst },
  };
  const extra: Document[] = [];
  if (query.sort === "title") extra.push({ $addFields: { _titleKey: { $toLower: { $ifNull: ["$title", ""] } } } });
  if (query.sort === "venue") extra.push({ $addFields: { _venueKey: { $toLower: { $ifNull: ["$venue_name", ""] } } } });
  if (query.sort === "participants") {
    extra.push(
      {
        $lookup: {
          from: "coaching_session_players",
          let: { sid: { $ifNull: ["$id", { $toString: "$_id" }] } },
          pipeline: [{ $match: { $expr: { $eq: ["$session_id", "$$sid"] } } }, { $count: "n" }],
          as: "_cnt",
        },
      },
      { $addFields: { _players: { $ifNull: [{ $arrayElemAt: ["$_cnt.n", 0] }, 0] } } },
    );
  }

  const docs = await sessionsColl
    .aggregate([
      { $match: match },
      ...extra,
      { $sort: sortKey[query.sort] },
      { $skip: (page - 1) * SESSIONS_PAGE_SIZE },
      { $limit: SESSIONS_PAGE_SIZE },
      { $project: { _titleKey: 0, _venueKey: 0, _players: 0, _cnt: 0 } },
    ])
    .toArray();

  const supabase = await createClient();
  const sessions = docs.map((d) => normalizeDoc(d) as CoachingSession);
  return { rows: await summarizeSessions(supabase, sessions), total, page, totalPages };
}

/** Adds player / rating totals and assigned coaches to each session — children loaded only for these sessions. */
async function summarizeSessions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessions: CoachingSession[],
): Promise<CoachingSessionSummary[]> {
  if (sessions.length === 0) return [];
  const sessionIds = sessions.map((s) => s.id);

  const [{ data: groups }, { data: sessionPlayers }, { data: assessments }] = await Promise.all([
    supabase.from("coaching_groups").select("id, session_id, coach_id, coaches(id, name)").in("session_id", sessionIds),
    supabase.from("coaching_session_players").select("session_id, player_id, group_id").in("session_id", sessionIds),
    supabase.from("coaching_assessments").select("session_id, player_id, status").in("session_id", sessionIds),
  ]);

  return sessions.map((s) => {
    const sGroups = (groups || []).filter((g) => g.session_id === s.id);
    const assignedCoaches: Array<{ id: string; name: string }> = [];
    const seenCoach = new Set<string>();
    for (const g of sGroups) {
      const c = g.coaches as unknown as { id: string; name: string } | null;
      if (c && !seenCoach.has(c.id)) {
        seenCoach.add(c.id);
        assignedCoaches.push({ id: c.id, name: c.name });
      }
    }

    const sPlayers = (sessionPlayers || []).filter((sp) => sp.session_id === s.id);
    const sAssessments = (assessments || []).filter((a) => a.session_id === s.id);

    const totalPlayers = sPlayers.length;
    const submittedCount = sAssessments.filter((a) => a.status === "submitted").length;
    const draftCount = sAssessments.filter((a) => a.status === "draft").length;
    const ratedCount = submittedCount + draftCount;

    return {
      ...s,
      totalPlayers,
      ratedPlayers: ratedCount,
      draftPlayers: draftCount,
      submittedPlayers: submittedCount,
      coaches: assignedCoaches,
    };
  });
}

/**
 * Recomputes a session's status from its current assessment progress and writes it if it changed
 * — called after every draft save / submit / bulk publish so Draft → Berjalan → Selesai happens on
 * its own instead of through the old manual status switch.
 */
export async function syncSessionStatus(supabase: Awaited<ReturnType<typeof createClient>>, sessionId: string): Promise<void> {
  const { data: sessionPlayers } = await supabase
    .from("coaching_session_players")
    .select("player_id")
    .eq("session_id", sessionId);
  const totalPlayers = sessionPlayers?.length ?? 0;

  const { data: assessments } = await supabase
    .from("coaching_assessments")
    .select("status")
    .eq("session_id", sessionId);
  const ratedPlayers = (assessments ?? []).filter((a) => a.status === "draft" || a.status === "submitted").length;
  const submittedPlayers = (assessments ?? []).filter((a) => a.status === "submitted").length;

  const nextStatus = deriveSessionStatus(totalPlayers, ratedPlayers, submittedPlayers);

  const { data: current } = await supabase.from("coaching_sessions").select("status").eq("id", sessionId).single();
  if (current && current.status !== nextStatus) {
    await supabase.from("coaching_sessions").update({ status: nextStatus }).eq("id", sessionId);
  }
}

// ------------------------------------------------------------- Session Full Details
export async function getSessionFullData(
  sessionId: string,
  coachFilterId?: string | null
): Promise<SessionFullData | null> {
  const supabase = await createClient();

  const { data: session, error: sErr } = await supabase
    .from("coaching_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (sErr || !session) return null;

  // 1. Parallel batch for session children
  const [
    { data: groups },
    { data: coaches },
    { data: skills },
    { data: sessionPlayers },
    { data: assessments },
  ] = await Promise.all([
    supabase
      .from("coaching_groups")
      .select("*")
      .eq("session_id", sessionId)
      .order("name", { ascending: true }),
    supabase
      .from("coaches")
      .select("*")
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase
      .from("coaching_skills")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase
      .from("coaching_session_players")
      .select("player_id, group_id, players(*)")
      .eq("session_id", sessionId),
    supabase
      .from("coaching_assessments")
      .select("*")
      .eq("session_id", sessionId),
  ]);

  const playerIds = (sessionPlayers || []).map((sp) => sp.player_id);

  // 2. Parallel batch for player-dependent data
  const [
    { data: directPlayers },
    { data: pastAssessments },
    { data: mabarCounts },
    { data: profiles },
  ] = await Promise.all([
    playerIds.length > 0
      ? supabase.from("players").select("*").in("id", playerIds)
      : Promise.resolve({ data: [] }),
    playerIds.length > 0
      ? supabase
          .from("coaching_assessments")
          .select("player_id, scores, evaluation, next_practice, coaching_sessions(title, session_date)")
          .in("player_id", playerIds)
          .eq("status", "submitted")
          .neq("session_id", sessionId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    playerIds.length > 0
      ? supabase
          .from("gen_participants")
          .select("player_id")
          .in("player_id", playerIds)
      : Promise.resolve({ data: [] }),
    playerIds.length > 0
      ? supabase
          .from("profiles")
          .select("player_id, email, whatsapp")
          .in("player_id", playerIds)
      : Promise.resolve({ data: [] }),
  ]);
  const profileMap = new Map((profiles || []).map((prof) => [prof.player_id, prof]));
  const playerMap = new Map((directPlayers || []).map((p) => [p.id, p]));
  const groupMap = new Map((groups || []).map((g) => [g.id, g]));
  const coachMap = new Map((coaches || []).map((c) => [c.id, c]));
  const assessmentMap = new Map((assessments || []).map((a) => [a.player_id, a]));

  const pastScoresMap: Record<string, Record<string, number>> = {};
  const pastNoteMap: Record<string, { evaluation: string; nextPractice: string; sessionTitle: string; sessionDate: string }> = {};
  if (pastAssessments) {
    for (const pa of pastAssessments) {
      if (!pastScoresMap[pa.player_id]) {
        pastScoresMap[pa.player_id] = (pa.scores as Record<string, number>) || {};
      }
      const sess = pa.coaching_sessions as unknown as { title: string; session_date: string } | null;
      if (!pastNoteMap[pa.player_id] && sess && ((pa.evaluation ?? "").trim() || (pa.next_practice ?? "").trim())) {
        pastNoteMap[pa.player_id] = {
          evaluation: pa.evaluation ?? "",
          nextPractice: pa.next_practice ?? "",
          sessionTitle: sess.title,
          sessionDate: sess.session_date,
        };
      }
    }
  }

  const mabarSet = new Set<string>();
  if (mabarCounts) {
    for (const row of mabarCounts) {
      if (row.player_id) mabarSet.add(row.player_id);
    }
  }

  const playerItems: SessionPlayerItem[] = [];

  for (const sp of sessionPlayers || []) {
    const rawPlayer = (sp.players as unknown as Player | null) || (sp.player_id ? playerMap.get(sp.player_id) : null);
    if (!rawPlayer) continue;

    const prof = profileMap.get(rawPlayer.id);
    const email = prof?.email || null;
    const whatsapp = rawPlayer.whatsapp || prof?.whatsapp || null;
    const p = { ...rawPlayer, whatsapp };

    const grp = sp.group_id ? groupMap.get(sp.group_id) || null : null;
    const coach = grp?.coach_id ? coachMap.get(grp.coach_id) || null : null;

    if (coachFilterId && grp?.coach_id !== coachFilterId) {
      // filter out if filtered by coach
      continue;
    }

    const asm = assessmentMap.get(p.id) || null;
    const status: "unrated" | "draft" | "submitted" = asm
      ? (asm.status as "draft" | "submitted")
      : "unrated";

    const prevScores = pastScoresMap[p.id] || {};
    const hasMabar = mabarSet.has(p.id) || (p.wins + p.losses > 0);

    const levelCalc = computePlayerLevel(asm?.scores, {
      hasMabarData: hasMabar,
      overrideLevel: asm?.override_level || (p.level_overridden ? p.level : null),
      overrideReason: asm?.override_reason || p.level_override_reason,
      currentLevel: p.level,
    });

    playerItems.push({
      player: p,
      group: grp,
      coach,
      assessment: asm,
      status,
      previousScores: prevScores,
      previousNote: pastNoteMap[p.id] || null,
      computedLevel: levelCalc,
      email,
    });
  }

  const total = (sessionPlayers || []).length;
  const submitted = (assessments || []).filter((a) => a.status === "submitted").length;
  const draft = (assessments || []).filter((a) => a.status === "draft").length;
  const rated = submitted + draft;

  return {
    session,
    groups: groups || [],
    coaches: coaches || [],
    skills: skills || [],
    players: playerItems,
    progress: {
      total,
      rated,
      draft,
      submitted,
    },
  };
}
