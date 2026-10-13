import type { Supa } from "@/lib/server/action";
import { splitNotes, type AwardRow, type CoachReport, type EventRow, type HistoryRow, type SkillDef } from "@/lib/coachingRules";
import { COACHING_SKILLS } from "@/lib/coachingSkills";

/**
 * The skill list as the admin keeps it in Master Teknik (active ones, in their order); scores are
 * keyed by these row ids. Falls back to the default list when the table is empty.
 */
async function loadSkills(supabase: Supa): Promise<SkillDef[]> {
  const { data } = await supabase
    .from("coaching_skills")
    .select("id, type, category, name, sort_order")
    .eq("active", true)
    .order("sort_order");
  if (!data?.length) return COACHING_SKILLS;
  return data.map((s) => ({ key: s.id, kind: s.type === "in_game" ? "ingame" : "teknik", group_label: s.category, label: s.name, sort: s.sort_order }));
}

/**
 * The skill list plus the player's submitted, published coaching assessments (oldest-first order
 * is up to the rules). RLS already limits a player to their own sent ones (0014); the explicit
 * filters keep an admin or coach who is also a player from seeing everyone's here.
 */
export async function loadCoaching(supabase: Supa, playerId: string | null): Promise<{ skills: SkillDef[]; reports: CoachReport[] }> {
  const skills = await loadSkills(supabase);
  if (!playerId) return { skills, reports: [] };

  const { data: rows } = await supabase
    .from("coaching_assessments")
    .select("id, session_id, coach_id, scores, evaluation, next_practice")
    .eq("player_id", playerId)
    .eq("status", "submitted")
    .eq("published_to_player", true);
  if (!rows?.length) return { skills, reports: [] };

  const coachIds = [...new Set(rows.map((r) => r.coach_id).filter((id): id is string => !!id))];
  const [{ data: sessions }, { data: coaches }] = await Promise.all([
    supabase.from("coaching_sessions").select("id, title, session_date, venue_name").in("id", [...new Set(rows.map((r) => r.session_id))]),
    coachIds.length ? supabase.from("coaches").select("id, name").in("id", coachIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const known = new Set(skills.map((s) => s.key));
  const sessionById = new Map((sessions ?? []).map((s) => [s.id, s]));
  const coachById = new Map((coaches ?? []).map((c) => [c.id, c.name]));

  const reports = rows.flatMap((r) => {
    const session = sessionById.get(r.session_id);
    if (!session) return [];
    return [{
      id: r.id,
      session: {
        id: session.id,
        title: session.title,
        session_date: session.session_date,
        venue: session.venue_name,
        coach_name: (r.coach_id && coachById.get(r.coach_id)) || "",
      },
      evaluation: splitNotes(r.evaluation),
      next_practice: splitNotes(r.next_practice),
      // only skills that got a score count as rated (picked-but-empty ones stay "belum dinilai");
      // scores of skills the admin has since turned off are left out
      ratings: Object.entries(r.scores ?? {}).flatMap(([skill_key, score]) =>
        known.has(skill_key) && Number(score) > 0 ? [{ skill_key, score: Number(score) }] : [],
      ),
    }];
  });
  return { skills, reports };
}

/** Everything the "Riwayat event" tab groups: match history with its match, awards, and events. */
export async function loadEventHistory(supabase: Supa, playerId: string | null): Promise<{ history: HistoryRow[]; awards: AwardRow[]; events: EventRow[] }> {
  if (!playerId) return { history: [], awards: [], events: [] };
  const [{ data: rows }, { data: awards }] = await Promise.all([
    supabase
      .from("match_history")
      .select("id, created_at, result, opponent_label, session_label, points_delta, match_id")
      .eq("player_id", playerId),
    supabase.from("player_awards").select("event_id, stage, rank, points").eq("player_id", playerId),
  ]);

  const matchIds = [...new Set((rows ?? []).map((r) => r.match_id).filter((id): id is string => !!id))];
  const { data: matches } = matchIds.length
    ? await supabase.from("matches").select("id, event_id, team_a_name, team_b_name, team_a_games, team_b_games").in("id", matchIds)
    : { data: [] };
  const matchById = new Map((matches ?? []).map((m) => [m.id, m]));

  const eventIds = [...new Set([...(matches ?? []).map((m) => m.event_id), ...(awards ?? []).map((a) => a.event_id)].filter((id): id is string => !!id))];
  const { data: events } = eventIds.length
    ? await supabase.from("events").select("id, title, type, event_date").in("id", eventIds)
    : { data: [] };

  return {
    history: (rows ?? []).map((r) => {
      const m = r.match_id ? matchById.get(r.match_id) : undefined;
      return {
        id: r.id,
        created_at: r.created_at,
        result: r.result,
        opponent_label: r.opponent_label,
        session_label: r.session_label,
        points_delta: r.points_delta,
        match: m
          ? { event_id: m.event_id ?? null, team_a_name: m.team_a_name, team_b_name: m.team_b_name, team_a_games: m.team_a_games ?? 0, team_b_games: m.team_b_games ?? 0 }
          : null,
      };
    }),
    awards: (awards ?? []).map((a) => ({ event_id: a.event_id, stage: a.stage, rank: a.rank, points: a.points })),
    events: events ?? [],
  };
}
