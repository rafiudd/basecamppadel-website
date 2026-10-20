import { createClient } from "@/lib/supabase/server";
import type {
  Coach,
  CoachingAssessment,
  CoachingGroup,
  CoachingSession,
  CoachingSkill,
  Player,
} from "@/lib/database.types";
import { computePlayerLevel, computeScoreDelta, type PlayerLevelName } from "./coaching";

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
  computedLevel: {
    level: PlayerLevelName;
    color: string;
    averageScore: number | null;
    rawLevel: PlayerLevelName;
    isOverridden: boolean;
    overrideReason?: string;
    cappedByMabar: boolean;
  };
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
export async function getCoachingSessions(options?: {
  coachId?: string | null;
}): Promise<CoachingSessionSummary[]> {
  const supabase = await createClient();

  // 1. Fetch sessions
  const { data: sessions, error } = await supabase
    .from("coaching_sessions")
    .select("*")
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!sessions || sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.id);

  // 2. Fetch groups with coach
  const { data: groups } = await supabase
    .from("coaching_groups")
    .select("id, session_id, coach_id, coaches(id, name)")
    .in("session_id", sessionIds);

  // 3. Fetch players count per session
  const { data: sessionPlayers } = await supabase
    .from("coaching_session_players")
    .select("session_id, player_id, group_id")
    .in("session_id", sessionIds);

  // 4. Fetch assessments
  const { data: assessments } = await supabase
    .from("coaching_assessments")
    .select("session_id, player_id, status")
    .in("session_id", sessionIds);

  const results: CoachingSessionSummary[] = sessions.map((s) => {
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

  if (options?.coachId) {
    return results.filter((s) => s.coaches.some((c) => c.id === options.coachId));
  }

  return results;
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

  // Groups
  const { data: groups } = await supabase
    .from("coaching_groups")
    .select("*")
    .eq("session_id", sessionId)
    .order("name", { ascending: true });

  // Coaches
  const { data: coaches } = await supabase
    .from("coaches")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });

  // Skills
  const { data: skills } = await supabase
    .from("coaching_skills")
    .select("*")
    .order("sort_order", { ascending: true });

  // Session Players
  const { data: sessionPlayers } = await supabase
    .from("coaching_session_players")
    .select("player_id, group_id, players(*)")
    .eq("session_id", sessionId);

  // Assessments for this session
  const { data: assessments } = await supabase
    .from("coaching_assessments")
    .select("*")
    .eq("session_id", sessionId);

  const playerIds = (sessionPlayers || []).map((sp) => sp.player_id);

  // Direct fetch fallback for players in case adapter join was not populated
  const { data: directPlayers } = playerIds.length > 0
    ? await supabase.from("players").select("*").in("id", playerIds)
    : { data: [] };
  const playerMap = new Map((directPlayers || []).map((p) => [p.id, p]));

  // Previous submitted assessments for delta computation
  // Find submitted assessments before this session date
  const { data: pastAssessments } = playerIds.length > 0
    ? await supabase
        .from("coaching_assessments")
        .select("player_id, scores, coaching_sessions(session_date)")
        .in("player_id", playerIds)
        .eq("status", "submitted")
        .neq("session_id", sessionId)
        .order("created_at", { ascending: false })
    : { data: [] };

  const pastScoresMap: Record<string, Record<string, number>> = {};
  if (pastAssessments) {
    for (const pa of pastAssessments) {
      if (!pastScoresMap[pa.player_id]) {
        pastScoresMap[pa.player_id] = (pa.scores as Record<string, number>) || {};
      }
    }
  }

  // Check mabar history per player (wins + losses or gen_participants count)
  const { data: mabarCounts } = playerIds.length > 0
    ? await supabase
        .from("gen_participants")
        .select("player_id")
        .in("player_id", playerIds)
    : { data: [] };

  const mabarSet = new Set<string>();
  if (mabarCounts) {
    for (const row of mabarCounts) {
      if (row.player_id) mabarSet.add(row.player_id);
    }
  }

  const groupMap = new Map((groups || []).map((g) => [g.id, g]));
  const coachMap = new Map((coaches || []).map((c) => [c.id, c]));
  const assessmentMap = new Map((assessments || []).map((a) => [a.player_id, a]));

  const playerItems: SessionPlayerItem[] = [];

  for (const sp of sessionPlayers || []) {
    const p = (sp.players as unknown as Player | null) || (sp.player_id ? playerMap.get(sp.player_id) : null);
    if (!p) continue;

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
      computedLevel: levelCalc,
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
