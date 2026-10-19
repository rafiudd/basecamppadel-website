import type { Supa } from "@/lib/server/action";
import { splitNotes, type AwardRow, type CoachReport, type EventRow, type HistoryRow, type NextSession, type SkillDef } from "@/lib/coachingRules";
import { COACHING_SKILLS } from "@/lib/coachingSkills";
import { matchSection } from "@/lib/compLabels";

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
    .select("id, session_id, coach_id, group_id, scores, evaluation, next_practice")
    .eq("player_id", playerId)
    .eq("status", "submitted")
    .eq("published_to_player", true);
  if (!rows?.length) return { skills, reports: [] };

  const groupIds = [...new Set(rows.map((r) => r.group_id).filter((id): id is string => !!id))];
  const [{ data: sessions }, { data: groups }] = await Promise.all([
    supabase.from("coaching_sessions").select("id, title, session_date, venue_name, event_id").in("id", [...new Set(rows.map((r) => r.session_id))]),
    groupIds.length ? supabase.from("coaching_groups").select("id, coach_id").in("id", groupIds) : Promise.resolve({ data: [] as { id: string; coach_id: string | null }[] }),
  ]);
  const groupCoach = new Map((groups ?? []).map((g) => [g.id, g.coach_id]));
  const coachIds = [...new Set([...rows.map((r) => r.coach_id), ...groupCoach.values()].filter((id): id is string => !!id))];
  const { data: coaches } = coachIds.length ? await supabase.from("coaches").select("id, name").in("id", coachIds) : { data: [] as { id: string; name: string }[] };
  const known = new Set(skills.map((s) => s.key));
  const sessionById = new Map((sessions ?? []).map((s) => [s.id, s]));
  const coachById = new Map((coaches ?? []).map((c) => [c.id, c.name]));
  const coachName = (id: string | null | undefined) => (id && coachById.get(id)) || "";

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
        coach_name: coachName(r.coach_id),
        group_coach_name: coachName(r.group_id ? groupCoach.get(r.group_id) : null),
        event_id: session.event_id,
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
    supabase.from("player_awards").select("event_id, stage, rank, points, created_at").eq("player_id", playerId),
  ]);

  const matchIds = [...new Set((rows ?? []).map((r) => r.match_id).filter((id): id is string => !!id))];
  const { data: matches } = matchIds.length
    ? await supabase.from("matches").select("id, event_id, team_a_name, team_b_name, team_a_games, team_b_games, stage, group_label, bracket_pos, set_label").in("id", matchIds)
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
          ? {
              event_id: m.event_id ?? null,
              team_a_name: m.team_a_name,
              team_b_name: m.team_b_name,
              team_a_games: m.team_a_games ?? 0,
              team_b_games: m.team_b_games ?? 0,
              section: matchSection(m) || null,
            }
          : null,
      };
    }),
    awards: (awards ?? []).map((a) => ({ event_id: a.event_id, stage: a.stage, rank: a.rank, points: a.points, created_at: a.created_at })),
    events: events ?? [],
  };
}

/**
 * "Sesi berikutnya": the nearest coaching session from today (WIB) that isn't finished; "Daftar
 * sekarang" goes to its event when it has one, else the schedule.
 */
export async function loadNextCoachingSession(supabase: Supa): Promise<NextSession | null> {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const { data: s } = await supabase
    .from("coaching_sessions")
    .select("title, session_date, venue_name, event_id")
    .neq("status", "finished")
    .gte("session_date", today)
    .order("session_date")
    .limit(1)
    .maybeSingle();
  if (!s) return null;
  const { data: event } = s.event_id
    ? await supabase.from("events").select("slug").eq("id", s.event_id).maybeSingle()
    : { data: null };
  return { title: s.title, date: s.session_date, venue: s.venue_name, href: event?.slug ? `/jadwal/${event.slug}` : "/jadwal" };
}
