import type { CompEvent, EventPoints, League, LeagueVolume, Match, Player } from "./database.types";
import {
  DEFAULT_LEAGUE_POINTS,
  computeLeagueStandings,
  determineLiveStage,
  formatStageLabel,
  type FinalStage,
  type LeaguePoints,
  type LeagueStandingRow,
  type LiveStageMatch,
  type PlayerVolumeResult,
  type PlayerVolumeScore,
} from "./leagueRules";

export {
  DEFAULT_LEAGUE_POINTS,
  computeLeagueStandings,
  determineLiveStage,
  formatStageLabel,
  type FinalStage,
  type LeaguePoints,
  type LeagueStandingRow,
  type LiveStageMatch,
  type PlayerVolumeResult,
  type PlayerVolumeScore,
};

export type VolumeWithEvent = LeagueVolume & {
  event: Pick<CompEvent, "id" | "slug" | "title" | "event_date" | "status" | "num_teams" | "whatsapp_url"> | null;
  team_count?: number;
  live_stage?: string;
  live_stage_name?: string;
};

export type LeagueWithVolumes = League & {
  volumes: VolumeWithEvent[];
  preset_name?: string;
};

type AnySupa = { from: (table: string) => any };

async function enrichVolumesWithLiveStage(supabase: AnySupa, volumes: VolumeWithEvent[]): Promise<void> {
  const activeEventIds = volumes
    .filter((v) => v.event?.status === "active" && v.event_id)
    .map((v) => v.event_id as string);

  if (activeEventIds.length === 0) return;

  const { data: matches } = await supabase
    .from("matches")
    .select("event_id, stage, status, is_live, is_bye")
    .in("event_id", activeEventIds);

  for (const v of volumes) {
    if (v.event?.status === "active" && v.event_id) {
      const evMatches = (matches ?? []).filter((m: any) => m.event_id === v.event_id);
      const stage = determineLiveStage(evMatches);
      v.live_stage = stage;
      v.live_stage_name = formatStageLabel(stage);
    }
  }
}

/**
 * Loads all leagues with their volume slots and associated events.
 */
export async function loadLeagues(
  supabase: AnySupa,
  options: { publishedOnly?: boolean } = {},
): Promise<LeagueWithVolumes[]> {
  let query = supabase.from("leagues").select("*, point_presets(name)").order("created_at", { ascending: false });
  if (options.publishedOnly) {
    query = query.eq("published", true);
  }
  const { data: leaguesData } = await query;
  if (!leaguesData || leaguesData.length === 0) return [];

  const leagueIds = leaguesData.map((l: any) => l.id);
  const { data: volumesData } = await supabase
    .from("league_volumes")
    .select("*, events:events!league_volumes_event_id_fkey(id, slug, title, event_date, status, num_teams, whatsapp_url)")
    .in("league_id", leagueIds)
    .order("volume_number", { ascending: true });

  const volumesByLeague = (volumesData ?? []).reduce((acc: Record<string, VolumeWithEvent[]>, v: any) => {
    if (!acc[v.league_id]) acc[v.league_id] = [];
    acc[v.league_id].push({
      id: v.id,
      league_id: v.league_id,
      volume_number: v.volume_number,
      is_final: v.is_final,
      event_id: v.event_id,
      approx_date: v.approx_date,
      created_at: v.created_at,
      event: v.events ?? null,
    });
    return acc;
  }, {});

  const allVolumes = Object.values(volumesByLeague).flat() as VolumeWithEvent[];
  await enrichVolumesWithLiveStage(supabase, allVolumes);

  return leaguesData.map((l: any) => ({
    id: l.id,
    slug: l.slug,
    name: l.name,
    organizer: l.organizer,
    description: l.description,
    total_volumes: l.total_volumes,
    point_preset_id: l.point_preset_id,
    points: l.points ?? DEFAULT_LEAGUE_POINTS,
    published: l.published,
    created_at: l.created_at,
    updated_at: l.updated_at,
    preset_name: l.point_presets?.name,
    volumes: volumesByLeague[l.id] ?? [],
  }));
}

/**
 * Loads a single league by slug.
 */
export async function loadLeagueBySlug(supabase: AnySupa, slug: string): Promise<LeagueWithVolumes | null> {
  const { data: leagueData } = await supabase
    .from("leagues")
    .select("*, point_presets(name)")
    .eq("slug", slug)
    .maybeSingle();

  if (!leagueData) return null;

  const { data: volumesData } = await supabase
    .from("league_volumes")
    .select("*, events:events!league_volumes_event_id_fkey(id, slug, title, event_date, status, num_teams, whatsapp_url)")
    .eq("league_id", leagueData.id)
    .order("volume_number", { ascending: true });

  const volumes: VolumeWithEvent[] = (volumesData ?? []).map((v: any) => ({
    id: v.id,
    league_id: v.league_id,
    volume_number: v.volume_number,
    is_final: v.is_final,
    event_id: v.event_id,
    approx_date: v.approx_date,
    created_at: v.created_at,
    event: v.events ?? null,
  }));

  await enrichVolumesWithLiveStage(supabase, volumes);

  return {
    id: leagueData.id,
    slug: leagueData.slug,
    name: leagueData.name,
    organizer: leagueData.organizer,
    description: leagueData.description,
    total_volumes: leagueData.total_volumes,
    point_preset_id: leagueData.point_preset_id,
    points: leagueData.points ?? DEFAULT_LEAGUE_POINTS,
    published: leagueData.published,
    created_at: leagueData.created_at,
    updated_at: leagueData.updated_at,
    preset_name: leagueData.point_presets?.name,
    volumes,
  };
}

/**
 * Loads a single league by id.
 */
export async function loadLeagueById(supabase: AnySupa, id: string): Promise<LeagueWithVolumes | null> {
  const { data: leagueData } = await supabase
    .from("leagues")
    .select("*, point_presets(name)")
    .eq("id", id)
    .maybeSingle();

  if (!leagueData) return null;

  const { data: volumesData } = await supabase
    .from("league_volumes")
    .select("*, events:events!league_volumes_event_id_fkey(id, slug, title, event_date, status, num_teams, whatsapp_url)")
    .eq("league_id", leagueData.id)
    .order("volume_number", { ascending: true });

  const volumes: VolumeWithEvent[] = (volumesData ?? []).map((v: any) => ({
    id: v.id,
    league_id: v.league_id,
    volume_number: v.volume_number,
    is_final: v.is_final,
    event_id: v.event_id,
    approx_date: v.approx_date,
    created_at: v.created_at,
    event: v.events ?? null,
  }));

  await enrichVolumesWithLiveStage(supabase, volumes);

  return {
    id: leagueData.id,
    slug: leagueData.slug,
    name: leagueData.name,
    organizer: leagueData.organizer,
    description: leagueData.description,
    total_volumes: leagueData.total_volumes,
    point_preset_id: leagueData.point_preset_id,
    points: leagueData.points ?? DEFAULT_LEAGUE_POINTS,
    published: leagueData.published,
    created_at: leagueData.created_at,
    updated_at: leagueData.updated_at,
    preset_name: leagueData.point_presets?.name,
    volumes,
  };
}


/**
 * Computes individual player standings for a league across all volumes.
 */
export async function loadLeagueStandings(
  supabase: AnySupa,
  league: LeagueWithVolumes,
): Promise<LeagueStandingRow[]> {
  const eventIds = league.volumes.map((v) => v.event_id).filter((id): id is string => !!id);
  if (eventIds.length === 0) return [];

  const [{ data: teamsData }, { data: playersLinkData }, { data: matchesData }] = await Promise.all([
    supabase.from("comp_teams").select("*").in("event_id", eventIds),
    supabase.from("comp_team_players").select("*").in("event_id", eventIds),
    supabase.from("matches").select("*").in("event_id", eventIds),
  ]);

  const playerIds = [...new Set((playersLinkData ?? []).map((l: any) => l.player_id))];
  if (playerIds.length === 0) return [];

  const { data: playersData } = await supabase.from("players").select("id, name").in("id", playerIds);
  const playerNames = new Map<string, string>((playersData ?? []).map((p: any) => [p.id, String(p.name)]));

  // Index teams and links by event_id
  const teamsByEvent = new Map<string, any[]>();
  for (const t of teamsData ?? []) {
    if (!teamsByEvent.has(t.event_id)) teamsByEvent.set(t.event_id, []);
    teamsByEvent.get(t.event_id)!.push(t);
  }

  const playersByTeam = new Map<string, string[]>();
  for (const l of playersLinkData ?? []) {
    if (!playersByTeam.has(l.team_id)) playersByTeam.set(l.team_id, []);
    playersByTeam.get(l.team_id)!.push(l.player_id);
  }

  const matchesByEvent = new Map<string, Match[]>();
  for (const m of matchesData ?? []) {
    if (m.event_id) {
      if (!matchesByEvent.has(m.event_id)) matchesByEvent.set(m.event_id, []);
      matchesByEvent.get(m.event_id)!.push(m);
    }
  }

  const results: PlayerVolumeResult[] = [];
  const pointsRules = (league.points ?? DEFAULT_LEAGUE_POINTS) as LeaguePoints;

  for (const vol of league.volumes) {
    if (!vol.event_id || !vol.event) continue;
    const eventId = vol.event_id;
    const eventStatus = vol.event.status;
    const teams = teamsByEvent.get(eventId) ?? [];
    const matches = matchesByEvent.get(eventId) ?? [];

    const isLive = eventStatus === "active";
    const isFinished = eventStatus === "finished";

    if (!isLive && !isFinished) {
      // Event draft/scheduled but not started: no standings yet
      continue;
    }

    // Determine stage reached by each team in this event
    for (const team of teams) {
      let stage: FinalStage = (team.final_stage as FinalStage) ?? "group";
      let isProvisional = false;

      if (isFinished) {
        stage = (team.final_stage as FinalStage) ?? "group";
        isProvisional = false;
      } else if (isLive) {
        isProvisional = true;
        // In a live knockout tournament, determine how far this team has progressed
        const teamMatches = matches.filter((m) => m.team_a_id === team.id || m.team_b_id === team.id);
        const finalMatch = teamMatches.find((m) => m.stage === "final");
        const sfMatch = teamMatches.find((m) => m.stage === "sf");
        const qfMatch = teamMatches.find((m) => m.stage === "qf");
        const r16Match = teamMatches.find((m) => m.stage === "r16");

        if (finalMatch) {
          if (finalMatch.status === "finished" && finalMatch.winner_team_id === team.id) {
            stage = "champion";
          } else {
            stage = "runner_up"; // guaranteed at least runner-up
          }
        } else if (sfMatch) {
          stage = "sf";
        } else if (qfMatch) {
          stage = "qf";
        } else if (r16Match) {
          stage = "r16";
        } else {
          stage = "group";
        }
      }

      const teamPlayers = playersByTeam.get(team.id) ?? [];
      for (const pId of teamPlayers) {
        results.push({
          playerId: pId,
          playerName: playerNames.get(pId) ?? "Pemain",
          volumeNumber: vol.volume_number,
          stage,
          isProvisional,
        });
      }
    }
  }

  return computeLeagueStandings(results, pointsRules);
}
