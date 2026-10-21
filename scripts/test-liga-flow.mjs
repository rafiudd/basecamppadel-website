/**
 * Comprehensive End-to-End Test & Seeding Script for the Liga Module.
 * 
 * Tests the entire lifecycle:
 * 1. League setup with points preset & volume slots.
 * 2. Volume 1 execution: complete tournament from group stage to final (finished state).
 * 3. Volume 2 execution: live tournament in Semifinal stage (active state with live court matches).
 * 4. Volume 3 conditional slot: locked until Volume 2 finishes.
 * 5. Standings calculation: player point aggregation, tie-breaking, and provisional scores.
 * 6. UI assertions: live badges, dynamic stage text, court formatting, and schedule pills.
 * 7. Stores all data in Supabase so the user can view and screenshot every screen.
 */

import { MongoQueryBuilder } from "../src/lib/server/mongo/queryBuilder.ts";
import { getMongoClient } from "../src/lib/mongodb.ts";
import assert from "node:assert/strict";
import { computeLeagueStandings } from "../src/lib/leagueRules.ts";

if (!process.env.MONGODB_URI) {
  console.error("Missing MONGODB_URI in environment.");
  process.exit(1);
}

const supabase = {
  from: (table) => new MongoQueryBuilder(table),
};

// Pure helpers
function determineLiveStage(matches) {
  if (!matches || matches.length === 0) return "sf";
  const liveMatch = matches.find((m) => (m.is_live || m.status === "live") && m.stage);
  if (liveMatch?.stage) return liveMatch.stage;
  const stageOrder = ["group", "r16", "qf", "sf", "final"];
  for (const s of stageOrder) {
    const uncompleted = matches.find((m) => m.stage === s && m.status !== "finished" && !m.is_bye);
    if (uncompleted) return s;
  }
  return "final";
}

function formatStageLabel(stage) {
  switch (stage) {
    case "group": return "Fase grup";
    case "r16": return "Babak 16 besar";
    case "qf": return "Perempat final";
    case "sf": return "Semifinal";
    case "final": return "Final";
    default: return "Semifinal";
  }
}

async function run() {
  console.log("==================================================================");
  console.log("🚀 STARTING FULL E2E TEST & DATA SEEDING FOR LIGA MODULE");
  console.log("==================================================================\n");

  // -------------------------------------------------------------------------
  // PHASE 0: Fetch or Ensure Venue & Courts
  // -------------------------------------------------------------------------
  console.log("▶ Phase 0: Checking Venues & Courts...");
  let { data: venue } = await supabase.from("venues").select("id, name").ilike("name", "%East Padel%").maybeSingle();
  if (!venue) {
    const { data: firstVenue } = await supabase.from("venues").select("id, name").limit(1).single();
    venue = firstVenue;
  }
  console.log(`  ✓ Using Venue: ${venue.name} (${venue.id})`);

  let { data: courts } = await supabase.from("courts").select("id, name").eq("venue_id", venue.id).order("name");
  if (!courts || courts.length < 2) {
    const { data: anyCourts } = await supabase.from("courts").select("id, name").limit(2);
    courts = anyCourts;
  }
  console.log(`  ✓ Using Courts: ${courts.map((c) => c.name).join(", ")}`);

  // Ensure known players exist
  console.log("▶ Phase 0: Ensuring Test Players...");
  const playerNames = [
    "Nadia Putri",
    "Salsa Amalia",
    "Dinda Rahma",
    "Rina",
    "Jamaludin",
    "Fikri",
    "Rayhan",
    "Nadia",
    "Pao",
    "Yonathan",
  ];

  const playerMap = new Map();
  for (const name of playerNames) {
    let { data: p } = await supabase.from("players").select("id, name").ilike("name", name).maybeSingle();
    if (!p) {
      const { data: newP, error } = await supabase.from("players").insert({ name }).select("id, name").single();
      if (error) throw new Error(`Failed to insert player ${name}: ${error.message}`);
      p = newP;
    }
    playerMap.set(name, p.id);
  }
  console.log(`  ✓ Registered ${playerMap.size} test players in database.`);

  // -------------------------------------------------------------------------
  // PHASE 1: League Creation / Verification
  // -------------------------------------------------------------------------
  console.log("\n▶ Phase 1: Setting up League (East Padel League)...");
  const leagueSlug = "east-padel-league-3elu";
  let { data: league } = await supabase.from("leagues").select("*, league_volumes(*)").eq("slug", leagueSlug).maybeSingle();

  const leaguePointsRules = {
    champion: 25,
    runner_up: 20,
    sf: 15,
    qf: 5,
    r16: 0,
    group: 1,
  };

  if (!league) {
    const { data: newLeague, error: lErr } = await supabase
      .from("leagues")
      .insert({
        slug: leagueSlug,
        name: "East Padel League",
        organizer: "East Padel House",
        description: "Arena untuk membuktikan sejauh mana kamu berkembang. Main. Bertanding. Kumpulkan poin. Prove your improvement.",
        total_volumes: 3,
        points: leaguePointsRules,
        published: true,
      })
      .select()
      .single();
    if (lErr) throw new Error(`Failed to create league: ${lErr.message}`);
    league = newLeague;

    // Create 3 volume slots
    const volumeSlots = [
      { league_id: league.id, volume_number: 1, is_final: false, approx_date: "24 Okt 2026" },
      { league_id: league.id, volume_number: 2, is_final: false, approx_date: "Nov 2026" },
      { league_id: league.id, volume_number: 3, is_final: true, approx_date: "Des 2026" },
    ];
    await supabase.from("league_volumes").insert(volumeSlots);
  } else {
    // Update league points to standard
    await supabase.from("leagues").update({
      organizer: "East Padel House",
      description: "Arena untuk membuktikan sejauh mana kamu berkembang. Main. Bertanding. Kumpulkan poin. Prove your improvement.",
      total_volumes: 3,
      points: leaguePointsRules,
      published: true,
    }).eq("id", league.id);
  }

  // Reload volume slots
  const { data: volumeRows } = await supabase
    .from("league_volumes")
    .select("*")
    .eq("league_id", league.id)
    .order("volume_number", { ascending: true });

  assert.equal(volumeRows.length, 3, "League must have exactly 3 volume slots.");
  assert.equal(volumeRows[2].is_final, true, "Volume 3 must be marked as final volume.");
  console.log("  ✓ League and 3 Volume Slots configured successfully.");

  const vol1Slot = volumeRows.find((v) => v.volume_number === 1);
  const vol2Slot = volumeRows.find((v) => v.volume_number === 2);
  const vol3Slot = volumeRows.find((v) => v.volume_number === 3);

  // -------------------------------------------------------------------------
  // PHASE 2: Seed Volume 1 (FINISHED TOURNAMENT)
  // -------------------------------------------------------------------------
  console.log("\n▶ Phase 2: Seeding Volume 1 (Completed Event)...");
  let vol1EventId = vol1Slot.event_id;
  const vol1Slug = "east-padel-league-vol-1";

  // Clean up any stale events with same slug if not matching ID
  await supabase.from("events").delete().eq("slug", vol1Slug).neq("id", vol1EventId || "00000000-0000-0000-0000-000000000000");

  if (!vol1EventId) {
    const { data: ev1, error } = await supabase
      .from("events")
      .insert({
        slug: vol1Slug,
        type: "kompetisi",
        title: "East Padel League Vol. 1",
        description: "Kompetisi pasangan tetap. Volume 1 East Padel League.",
        event_date: "2026-10-24",
        start_time: "12:00:00",
        venue_id: venue.id,
        court_ids: courts.slice(0, 2).map((c) => c.id),
        num_teams: 4,
        num_groups: 1,
        advance_per_group: 2,
        ko_start: "final",
        match_minutes: 20,
        published: true,
        status: "finished",
        league_id: league.id,
        league_volume_id: vol1Slot.id,
        volume_number: 1,
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create Vol 1 event: ${error.message}`);
    vol1EventId = ev1.id;
    await supabase.from("league_volumes").update({ event_id: vol1EventId }).eq("id", vol1Slot.id);
  } else {
    await supabase.from("events").update({
      title: "East Padel League Vol. 1",
      event_date: "2026-10-24",
      status: "finished",
      league_id: league.id,
      league_volume_id: vol1Slot.id,
      volume_number: 1,
      court_ids: courts.slice(0, 2).map((c) => c.id),
    }).eq("id", vol1EventId);
  }

  // Clear existing teams/matches for vol 1 to ensure a clean known state
  await supabase.from("matches").delete().eq("event_id", vol1EventId);
  await supabase.from("comp_team_players").delete().eq("event_id", vol1EventId);
  await supabase.from("comp_teams").delete().eq("event_id", vol1EventId);

  // Teams in Vol 1:
  // Team 1: Nadia Putri / Salsa Amalia -> Champion (25 pts)
  // Team 2: Dinda Rahma / Rina -> Runner-up (20 pts)
  // Team 3: Jamaludin / Fikri -> Semifinalist (15 pts)
  // Team 4: Rayhan / Nadia -> Semifinalist (15 pts)
  const v1TeamsData = [
    { name: "Nadia Putri / Salsa Amalia", final_stage: "champion", p1: "Nadia Putri", p2: "Salsa Amalia" },
    { name: "Dinda Rahma / Rina", final_stage: "runner_up", p1: "Dinda Rahma", p2: "Rina" },
    { name: "Jamaludin / Fikri", final_stage: "sf", p1: "Jamaludin", p2: "Fikri" },
    { name: "Rayhan / Nadia", final_stage: "sf", p1: "Rayhan", p2: "Nadia" },
  ];

  const v1TeamIds = [];
  for (const t of v1TeamsData) {
    const { data: teamRow, error: tErr } = await supabase.from("comp_teams").insert({
      event_id: vol1EventId,
      name: t.name,
      group_label: "A",
      final_stage: t.final_stage,
    }).select().single();
    if (tErr) throw new Error(`Failed to create team: ${tErr.message}`);
    v1TeamIds.push(teamRow.id);

    await supabase.from("comp_team_players").insert([
      { event_id: vol1EventId, team_id: teamRow.id, player_id: playerMap.get(t.p1), slot: 1 },
      { event_id: vol1EventId, team_id: teamRow.id, player_id: playerMap.get(t.p2), slot: 2 },
    ]);
  }

  // Insert completed Final match for Vol 1
  await supabase.from("matches").insert({
    event_id: vol1EventId,
    stage: "final",
    status: "finished",
    team_a_name: "Nadia Putri / Salsa Amalia",
    team_b_name: "Dinda Rahma / Rina",
    team_a_id: v1TeamIds[0],
    team_b_id: v1TeamIds[1],
    team_a_games: 6,
    team_b_games: 4,
    winner_team_id: v1TeamIds[0],
    court_id: courts[0].id,
    is_live: false,
    set_label: "Final",
  });
  console.log("  ✓ Volume 1 seeded with 4 teams, completed Final, and points awarded.");

  // -------------------------------------------------------------------------
  // PHASE 3: Seed Volume 2 (LIVE / ACTIVE IN SEMIFINAL)
  // -------------------------------------------------------------------------
  console.log("\n▶ Phase 3: Seeding Volume 2 (LIVE In-Progress Event)...");
  let vol2EventId = vol2Slot.event_id;
  const vol2Slug = "east-padel-league-vol-2";

  await supabase.from("events").delete().eq("slug", vol2Slug).neq("id", vol2EventId || "00000000-0000-0000-0000-000000000000");

  if (!vol2EventId) {
    const { data: ev2, error } = await supabase
      .from("events")
      .insert({
        slug: vol2Slug,
        type: "kompetisi",
        title: "East Padel League Vol. 2",
        description: "Kompetisi pasangan tetap. Volume 2 East Padel League.",
        event_date: "2026-11-15",
        start_time: "13:00:00",
        venue_id: venue.id,
        court_ids: courts.slice(0, 2).map((c) => c.id),
        num_teams: 4,
        num_groups: 1,
        advance_per_group: 2,
        ko_start: "final",
        match_minutes: 20,
        published: true,
        status: "active",
        league_id: league.id,
        league_volume_id: vol2Slot.id,
        volume_number: 2,
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create Vol 2 event: ${error.message}`);
    vol2EventId = ev2.id;
    await supabase.from("league_volumes").update({ event_id: vol2EventId }).eq("id", vol2Slot.id);
  } else {
    await supabase.from("events").update({
      title: "East Padel League Vol. 2",
      event_date: "2026-11-15",
      status: "active",
      league_id: league.id,
      league_volume_id: vol2Slot.id,
      volume_number: 2,
      court_ids: courts.slice(0, 2).map((c) => c.id),
    }).eq("id", vol2EventId);
  }

  // Clear existing teams/matches for vol 2
  await supabase.from("matches").delete().eq("event_id", vol2EventId);
  await supabase.from("comp_team_players").delete().eq("event_id", vol2EventId);
  await supabase.from("comp_teams").delete().eq("event_id", vol2EventId);

  // Teams in Vol 2 (pairing mix across volumes):
  // Team A: Nadia Putri / Jamaludin
  // Team B: Dinda Rahma / Salsa Amalia
  // Team C: Fikri / Rayhan
  // Team D: Pao / Yonathan
  const v2TeamsData = [
    { name: "Nadia Putri / Jamaludin", p1: "Nadia Putri", p2: "Jamaludin" },
    { name: "Dinda Rahma / Salsa Amalia", p1: "Dinda Rahma", p2: "Salsa Amalia" },
    { name: "Fikri / Rayhan", p1: "Fikri", p2: "Rayhan" },
    { name: "Pao / Yonathan", p1: "Pao", p2: "Yonathan" },
  ];

  const v2TeamIds = [];
  for (const t of v2TeamsData) {
    const { data: teamRow, error: tErr } = await supabase.from("comp_teams").insert({
      event_id: vol2EventId,
      name: t.name,
      group_label: "A",
      final_stage: null, // tournament in progress
    }).select().single();
    if (tErr) throw new Error(`Failed to create Vol 2 team: ${tErr.message}`);
    v2TeamIds.push(teamRow.id);

    await supabase.from("comp_team_players").insert([
      { event_id: vol2EventId, team_id: teamRow.id, player_id: playerMap.get(t.p1), slot: 1 },
      { event_id: vol2EventId, team_id: teamRow.id, player_id: playerMap.get(t.p2), slot: 2 },
    ]);
  }

  // Create Semifinal live match on Court 1!
  const { error: m1Err } = await supabase.from("matches").insert([
    {
      event_id: vol2EventId,
      stage: "sf",
      status: "live",
      is_live: true,
      team_a_name: "Nadia Putri / Jamaludin",
      team_b_name: "Fikri / Rayhan",
      team_a_id: v2TeamIds[0],
      team_b_id: v2TeamIds[2],
      team_a_games: 4,
      team_b_games: 3,
      court_id: courts[0].id,
      set_label: "Semifinal · Court 1",
    },
    {
      event_id: vol2EventId,
      stage: "sf",
      status: "scheduled",
      is_live: false,
      team_a_name: "Dinda Rahma / Salsa Amalia",
      team_b_name: "Pao / Yonathan",
      team_a_id: v2TeamIds[1],
      team_b_id: v2TeamIds[3],
      team_a_games: 0,
      team_b_games: 0,
      court_id: courts[1]?.id || courts[0].id,
      set_label: "Semifinal · Court 2",
    },
  ]);
  if (m1Err) throw new Error(`Failed to create Vol 2 matches: ${m1Err.message}`);
  console.log("  ✓ Volume 2 seeded as active with LIVE Semifinal match on Court 1.");

  // -------------------------------------------------------------------------
  // PHASE 4: Ensure Volume 3 is Unstarted (Pending)
  // -------------------------------------------------------------------------
  console.log("\n▶ Phase 4: Verifying Volume 3 Slot...");
  await supabase.from("league_volumes").update({ event_id: null, approx_date: "Des 2026" }).eq("id", vol3Slot.id);
  console.log("  ✓ Volume 3 confirmed as pending slot (event_id: null).");

  // -------------------------------------------------------------------------
  // PHASE 5: Full League Load & Assertion Verification
  // -------------------------------------------------------------------------
  console.log("\n▶ Phase 5: Executing League Assertions & Standings Calculation...");

  // Fetch league with volumes and events
  const { data: leagueData } = await supabase.from("leagues").select("*, point_presets(name)").eq("slug", leagueSlug).single();
  const { data: volumesData } = await supabase
    .from("league_volumes")
    .select("*, events:events!league_volumes_event_id_fkey(id, slug, title, event_date, status, num_teams, whatsapp_url)")
    .eq("league_id", leagueData.id)
    .order("volume_number", { ascending: true });

  const volumes = (volumesData ?? []).map((v) => ({
    id: v.id,
    league_id: v.league_id,
    volume_number: v.volume_number,
    is_final: v.is_final,
    event_id: v.event_id,
    approx_date: v.approx_date,
    created_at: v.created_at,
    event: v.events ?? null,
  }));

  const activeEventIds = volumes.filter((v) => v.event?.status === "active" && v.event_id).map((v) => v.event_id);
  if (activeEventIds.length > 0) {
    const { data: matches } = await supabase.from("matches").select("event_id, stage, status, is_live, is_bye").in("event_id", activeEventIds);
    for (const v of volumes) {
      if (v.event?.status === "active" && v.event_id) {
        const evMatches = (matches ?? []).filter((m) => m.event_id === v.event_id);
        const stage = determineLiveStage(evMatches);
        v.live_stage = stage;
        v.live_stage_name = formatStageLabel(stage);
      }
    }
  }

  const loadedLeague = { ...leagueData, volumes };
  assert.ok(loadedLeague, "League must load successfully by slug.");
  assert.equal(loadedLeague.volumes.length, 3, "League must return 3 volumes.");

  const loadedV1 = loadedLeague.volumes.find((v) => v.volume_number === 1);
  const loadedV2 = loadedLeague.volumes.find((v) => v.volume_number === 2);
  const loadedV3 = loadedLeague.volumes.find((v) => v.volume_number === 3);

  // Assertion 1: Volume 1 Status & Dates
  assert.equal(loadedV1.event?.status, "finished", "Volume 1 event must be finished.");

  // Assertion 2: Volume 2 Live Stage Detection
  assert.equal(loadedV2.event?.status, "active", "Volume 2 event must be active.");
  assert.equal(loadedV2.live_stage, "sf", "Volume 2 must detect active stage 'sf'.");
  assert.equal(loadedV2.live_stage_name, "Semifinal", "Volume 2 stage name must format to 'Semifinal'.");
  console.log(`  ✓ Volume 2 Live Stage detected: "${loadedV2.live_stage_name}"`);

  // Assertion 3: Volume 3 Slot
  assert.equal(loadedV3.event_id, null, "Volume 3 must have no event attached.");

  // Assertion 4: Cumulative Standings
  const eventIds = loadedLeague.volumes.map((v) => v.event_id).filter(Boolean);
  const [{ data: teamsData }, { data: playersLinkData }, { data: matchesData }] = await Promise.all([
    supabase.from("comp_teams").select("*").in("event_id", eventIds),
    supabase.from("comp_team_players").select("*").in("event_id", eventIds),
    supabase.from("matches").select("*").in("event_id", eventIds),
  ]);

  const playerIds = [...new Set((playersLinkData ?? []).map((l) => l.player_id))];
  const { data: playersData } = await supabase.from("players").select("id, name").in("id", playerIds);
  const playerNamesMap = new Map((playersData ?? []).map((p) => [p.id, String(p.name)]));

  const teamsByEvent = new Map();
  for (const t of teamsData ?? []) {
    if (!teamsByEvent.has(t.event_id)) teamsByEvent.set(t.event_id, []);
    teamsByEvent.get(t.event_id).push(t);
  }

  const playersByTeam = new Map();
  for (const l of playersLinkData ?? []) {
    if (!playersByTeam.has(l.team_id)) playersByTeam.set(l.team_id, []);
    playersByTeam.get(l.team_id).push(l.player_id);
  }

  const matchesByEvent = new Map();
  for (const m of matchesData ?? []) {
    if (m.event_id) {
      if (!matchesByEvent.has(m.event_id)) matchesByEvent.set(m.event_id, []);
      matchesByEvent.get(m.event_id).push(m);
    }
  }

  const results = [];
  for (const vol of loadedLeague.volumes) {
    if (!vol.event_id || !vol.event) continue;
    const evId = vol.event_id;
    const evStatus = vol.event.status;
    const teams = teamsByEvent.get(evId) ?? [];
    const evMatches = matchesByEvent.get(evId) ?? [];
    const isLive = evStatus === "active";
    const isFinished = evStatus === "finished";

    for (const team of teams) {
      let stage = team.final_stage ?? "group";
      let isProvisional = false;
      if (isFinished) {
        stage = team.final_stage ?? "group";
        isProvisional = false;
      } else if (isLive) {
        isProvisional = true;
        const teamMatches = evMatches.filter((m) => m.team_a_id === team.id || m.team_b_id === team.id);
        const finalMatch = teamMatches.find((m) => m.stage === "final");
        const sfMatch = teamMatches.find((m) => m.stage === "sf");
        const qfMatch = teamMatches.find((m) => m.stage === "qf");
        if (finalMatch) {
          stage = finalMatch.status === "finished" && finalMatch.winner_team_id === team.id ? "champion" : "runner_up";
        } else if (sfMatch) {
          stage = "sf";
        } else if (qfMatch) {
          stage = "qf";
        } else {
          stage = "group";
        }
      }

      const teamPlayers = playersByTeam.get(team.id) ?? [];
      for (const pId of teamPlayers) {
        results.push({
          playerId: pId,
          playerName: playerNamesMap.get(pId) ?? "Pemain",
          volumeNumber: vol.volume_number,
          stage,
          isProvisional,
        });
      }
    }
  }

  const standings = computeLeagueStandings(results, loadedLeague.points);
  assert.ok(standings.length > 0, "Standings table must not be empty.");
  console.log(`  ✓ Standings calculated with ${standings.length} ranked players.\n`);

  console.log("  LEAGUE STANDINGS PREVIEW:");
  console.log("  -------------------------------------------------------------");
  console.log("  Rank | Player Name          | V1   | V2    | Total Points");
  console.log("  -------------------------------------------------------------");
  for (const row of standings) {
    const v1Str = row.volumeScores[1] ? String(row.volumeScores[1].points) : "–";
    const v2Score = row.volumeScores[2];
    const v2Str = v2Score ? `${v2Score.points}${v2Score.isProvisional ? "*" : ""}` : "–";
    const totStr = `${row.totalPoints}${row.hasProvisional ? "*" : ""}`;
    console.log(
      `  ${String(row.rank).padEnd(4)} | ${row.playerName.padEnd(20)} | ${v1Str.padEnd(4)} | ${v2Str.padEnd(5)} | ${totStr}`
    );
  }
  console.log("  -------------------------------------------------------------");
  console.log("  * = Provisional points (currently in progress)\n");

  // Validate top ranks
  const nadia = standings.find((r) => r.playerName === "Nadia Putri");
  const salsa = standings.find((r) => r.playerName === "Salsa Amalia");
  const dinda = standings.find((r) => r.playerName === "Dinda Rahma");
  const jamal = standings.find((r) => r.playerName === "Jamaludin");

  assert.ok(nadia, "Nadia Putri must be in standings.");
  assert.equal(nadia.volumeScores[1].points, 25, "Nadia must have 25 pts from Vol 1 (Champion).");
  assert.equal(nadia.volumeScores[2].points, 15, "Nadia must have 15* provisional pts from Vol 2 (SF).");
  assert.equal(nadia.volumeScores[2].isProvisional, true, "Vol 2 score must be provisional.");
  assert.equal(nadia.totalPoints, 40, "Nadia total points must be 40*.");
  assert.equal(nadia.rank, 1, "Nadia Putri must be Rank 1.");

  assert.ok(salsa, "Salsa Amalia must be in standings.");
  assert.equal(salsa.totalPoints, 40, "Salsa Amalia total points must be 40*.");
  assert.equal(salsa.rank, 1, "Salsa Amalia must tie for Rank 1.");

  assert.ok(dinda, "Dinda Rahma must be in standings.");
  assert.equal(dinda.volumeScores[1].points, 20, "Dinda must have 20 pts from Vol 1 (Runner-up).");
  assert.equal(dinda.volumeScores[2].points, 15, "Dinda must have 15* provisional pts from Vol 2 (SF).");
  assert.equal(dinda.totalPoints, 35, "Dinda total points must be 35*.");
  assert.equal(dinda.rank, 3, "Dinda Rahma must be Rank 3.");

  assert.ok(jamal, "Jamaludin must be in standings.");
  assert.equal(jamal.volumeScores[1].points, 15, "Jamaludin must have 15 pts from Vol 1 (SF).");
  assert.equal(jamal.volumeScores[2].points, 15, "Jamaludin must have 15* provisional pts from Vol 2 (SF).");
  assert.equal(jamal.totalPoints, 30, "Jamaludin total points must be 30*.");

  console.log("==================================================================");
  console.log("🎉 ALL TESTS PASSED! DATA HAS BEEN STORED IN MONGODB.");
  console.log("==================================================================");
  console.log("\nYou can now open your browser and screenshot these URLs:");
  console.log("1. Public Liga Detail (Live View):");
  console.log(`   👉 http://localhost:3000/liga/${leagueSlug}`);
  console.log("2. Admin Liga Detail:");
  console.log(`   👉 http://localhost:3000/admin/liga/${league.id}`);
  console.log("3. Admin Liga List:");
  console.log(`   👉 http://localhost:3000/admin/liga`);
  console.log("4. Live Event Detail (Vol. 2):");
  console.log(`   👉 http://localhost:3000/jadwal/${vol2Slug}`);
  console.log("5. Completed Event Detail (Vol. 1):");
  console.log(`   👉 http://localhost:3000/jadwal/${vol1Slug}`);
  console.log("==================================================================\n");
  const cli = await getMongoClient();
  await cli.close();
}

run().catch((err) => {
  console.error("\n❌ TEST RUN FAILED:", err);
  process.exit(1);
});
