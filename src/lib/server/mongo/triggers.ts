import type { Db } from "mongodb";
import { DEFAULT_MATCH_SETS } from "../../database.types.ts";
import { DEFAULT_LEAGUE_POINTS } from "../../leagueRules.ts";

/**
 * Maps player skill level to its official badge hex color.
 * Mirrors Postgres `players_level_color()` trigger from `0007_coaching.sql`.
 */
export function levelColorFor(level?: string | null): string {
  switch (level) {
    case "Rookie":
      return "#FBF7F1";
    case "Beginner":
      return "#FFD43B";
    case "Low Bronze":
      return "#2563EB";
    case "Bronze":
      return "#EF4444";
    case "Silver":
      return "#17151F";
    default:
      return "#FFD43B";
  }
}

/**
 * Applies table-level column defaults that PostgreSQL used to provide via DDL `DEFAULT`.
 */
export function applyCollectionDefaults(
  collectionName: string,
  item: Record<string, any>
): Record<string, any> {
  const doc = { ...item };

  switch (collectionName) {
    case "players": {
      if (doc.points === undefined) doc.points = 0;
      if (doc.wins === undefined) doc.wins = 0;
      if (doc.losses === undefined) doc.losses = 0;
      if (doc.points_adjustment === undefined) doc.points_adjustment = 0;
      if (doc.active === undefined) doc.active = true;
      if (doc.level === undefined) doc.level = "Beginner";
      doc.level_color = levelColorFor(doc.level);
      if (doc.level_overridden === undefined) doc.level_overridden = false;
      if (doc.region === undefined) doc.region = "";
      break;
    }
    case "events": {
      if (doc.status === undefined) doc.status = "draft";
      if (doc.points === undefined) doc.points = { win: 3, loss: 1 };
      if (doc.courts === undefined) doc.courts = 1;
      if (doc.bracket_stale === undefined) doc.bracket_stale = false;
      if (doc.format === undefined) doc.format = null;
      break;
    }
    case "matches": {
      if (!Array.isArray(doc.team_a_sets)) doc.team_a_sets = [...DEFAULT_MATCH_SETS];
      if (!Array.isArray(doc.team_b_sets)) doc.team_b_sets = [...DEFAULT_MATCH_SETS];
      if (doc.team_a_game === undefined) doc.team_a_game = "0";
      if (doc.team_b_game === undefined) doc.team_b_game = "0";
      if (doc.games_a === undefined) doc.games_a = 0;
      if (doc.games_b === undefined) doc.games_b = 0;
      if (doc.set_label === undefined) doc.set_label = "TOTAL GAMES";
      if (doc.is_live === undefined) doc.is_live = false;
      if (doc.timer_running === undefined) doc.timer_running = false;
      if (doc.timer_base_seconds === undefined) doc.timer_base_seconds = 0;
      if (doc.is_wo === undefined) doc.is_wo = false;
      // remaining Postgres defaults (0001 + 0005): games are what the kompetisi and mabar score cards read
      if (doc.team_a_games === undefined) doc.team_a_games = 0;
      if (doc.team_b_games === undefined) doc.team_b_games = 0;
      if (doc.is_bye === undefined) doc.is_bye = false;
      if (doc.status === undefined) doc.status = "scheduled";
      if (doc.serve === undefined) doc.serve = "A";
      if (doc.session_label === undefined) doc.session_label = "";
      if (doc.venue === undefined) doc.venue = "";
      if (doc.team_a_name === undefined) doc.team_a_name = "Team A";
      if (doc.team_b_name === undefined) doc.team_b_name = "Team B";
      if (!Array.isArray(doc.team_a_player_ids)) doc.team_a_player_ids = [];
      if (!Array.isArray(doc.team_b_player_ids)) doc.team_b_player_ids = [];
      break;
    }
    case "coaching_sessions": {
      if (doc.status === undefined) doc.status = "draft";
      if (doc.venue_name === undefined) doc.venue_name = "";
      if (doc.notes === undefined) doc.notes = "";
      break;
    }
    case "coaching_session_players": {
      if (doc.attended === undefined) doc.attended = true;
      break;
    }
    case "coaching_groups": {
      if (doc.court === undefined) doc.court = "";
      break;
    }
    case "gen_participants": {
      // 0003 + 0007: a substituted player is set inactive explicitly; everyone else starts active and checked in
      if (doc.display_name === undefined) doc.display_name = "";
      if (doc.total_points === undefined) doc.total_points = 0;
      if (doc.sits_out_count === undefined) doc.sits_out_count = 0;
      if (doc.checked_in === undefined) doc.checked_in = true;
      if (doc.active === undefined) doc.active = true;
      break;
    }
    case "coaches": {
      if (doc.active === undefined) doc.active = true;
      if (doc.level === undefined) doc.level = "";
      if (doc.whatsapp === undefined) doc.whatsapp = "";
      if (doc.instagram === undefined) doc.instagram = "";
      if (doc.bio === undefined) doc.bio = "";
      break;
    }
    case "leagues": {
      if (doc.organizer === undefined) doc.organizer = "";
      if (doc.description === undefined) doc.description = "";
      if (doc.total_volumes === undefined) doc.total_volumes = 3;
      if (doc.points === undefined) doc.points = { ...DEFAULT_LEAGUE_POINTS };
      if (doc.published === undefined) doc.published = true;
      break;
    }
    case "league_volumes": {
      if (doc.is_final === undefined) doc.is_final = false;
      if (doc.event_id === undefined) doc.event_id = null;
      if (doc.approx_date === undefined) doc.approx_date = "";
      break;
    }
    case "classes": {
      if (doc.active === undefined) doc.active = true;
      if (doc.sort_order === undefined) doc.sort_order = 0;
      if (doc.curriculum === undefined) doc.curriculum = [];
      if (doc.gallery_urls === undefined) doc.gallery_urls = [];
      break;
    }
    case "class_schedules": {
      if (doc.status === undefined) doc.status = "open";
      if (doc.booked_slots === undefined) doc.booked_slots = 0;
      if (doc.notes === undefined) doc.notes = "";
      break;
    }
    case "class_reviews": {
      if (doc.approved === undefined) doc.approved = false;
      if (doc.rating === undefined) doc.rating = 5;
      break;
    }
  }

  return doc;
}

/**
 * Recomputes `wins`, `losses`, and `points` for one or more players.
 * Mirrors PostgreSQL `recompute_player_stats(p_id uuid)` from `0002_admin_features.sql`:
 *   wins   = count(match_history where result = 'W')
 *   losses = count(match_history where result = 'L')
 *   points = greatest(0, sum(match_history.points_delta) + sum(player_awards.points) + points_adjustment)
 */
export async function recomputePlayerStats(
  db: Db,
  playerIds: (string | null | undefined)[]
): Promise<void> {
  const uniqueIds = Array.from(
    new Set(playerIds.filter((id): id is string => Boolean(id && String(id).trim())))
  );
  if (uniqueIds.length === 0) return;

  const playersColl = db.collection("players");
  const historyColl = db.collection("match_history");
  const awardsColl = db.collection("player_awards");

  for (const pid of uniqueIds) {
    const player = await playersColl.findOne({
      $or: [{ _id: pid }, { id: pid }],
    } as any);
    if (!player) continue;

    const historyRows = await historyColl.find({ player_id: pid }).toArray();
    let wins = 0;
    let losses = 0;
    let matchPoints = 0;
    for (const row of historyRows) {
      if (row.result === "W") wins += 1;
      else if (row.result === "L") losses += 1;
      matchPoints += Number(row.points_delta || 0);
    }

    const awardRows = await awardsColl.find({ player_id: pid }).toArray();
    let awardPoints = 0;
    for (const award of awardRows) {
      awardPoints += Number(award.points || 0);
    }

    const adjustment = Number(player.points_adjustment || 0);
    const totalPoints = Math.max(0, matchPoints + awardPoints + adjustment);

    await playersColl.updateOne(
      { _id: player._id },
      {
        $set: {
          wins,
          losses,
          points: totalPoints,
          updated_at: new Date(),
        },
      }
    );
  }
}

/**
 * Emulates PostgreSQL `ON DELETE CASCADE` and `ON DELETE SET NULL` foreign key actions,
 * plus trigger-driven player stat recomputations on child deletions.
 */
export async function handleCascadeDelete(
  db: Db,
  collectionName: string,
  deletedDocs: any[]
): Promise<void> {
  if (!deletedDocs || deletedDocs.length === 0) return;

  const ids = Array.from(
    new Set(
      deletedDocs
        .map((d) => String(d.id || d._id || d.user_id || ""))
        .filter(Boolean)
    )
  );
  if (ids.length === 0) return;

  switch (collectionName) {
    case "match_history":
    case "player_awards": {
      const playerIds = deletedDocs.map((d) => d.player_id).filter(Boolean);
      await recomputePlayerStats(db, playerIds);
      break;
    }

    case "gen_rounds": {
      const genMatches = await db
        .collection("gen_matches")
        .find({ round_id: { $in: ids } })
        .toArray();
      await db.collection("gen_matches").deleteMany({ round_id: { $in: ids } });

      const matchIds = genMatches.map((gm) => gm.match_id).filter(Boolean);
      if (matchIds.length > 0) {
        const matchesToDelete = await db
          .collection("matches")
          .find({ $or: [{ _id: { $in: matchIds } }, { id: { $in: matchIds } }] } as any)
          .toArray();
        await db
          .collection("matches")
          .deleteMany({ $or: [{ _id: { $in: matchIds } }, { id: { $in: matchIds } }] } as any);
        await handleCascadeDelete(db, "matches", matchesToDelete);
      }
      break;
    }

    case "matches": {
      await db.collection("gen_matches").deleteMany({ match_id: { $in: ids } });
      await db.collection("comp_score_log").deleteMany({ match_id: { $in: ids } });
      await db
        .collection("matches")
        .updateMany({ next_match_id: { $in: ids } }, { $set: { next_match_id: null } });

      const histRows = await db
        .collection("match_history")
        .find({ match_id: { $in: ids } })
        .toArray();
      if (histRows.length > 0) {
        await db.collection("match_history").deleteMany({ match_id: { $in: ids } });
        await recomputePlayerStats(
          db,
          histRows.map((h) => h.player_id)
        );
      }
      break;
    }

    case "events": {
      const matches = await db
        .collection("matches")
        .find({ event_id: { $in: ids } })
        .toArray();
      if (matches.length > 0) {
        await db.collection("matches").deleteMany({ event_id: { $in: ids } });
        await handleCascadeDelete(db, "matches", matches);
      }

      const rounds = await db
        .collection("gen_rounds")
        .find({ event_id: { $in: ids } })
        .toArray();
      if (rounds.length > 0) {
        await db.collection("gen_rounds").deleteMany({ event_id: { $in: ids } });
        await handleCascadeDelete(db, "gen_rounds", rounds);
      }

      await db.collection("gen_participants").deleteMany({ event_id: { $in: ids } });

      const teams = await db
        .collection("comp_teams")
        .find({ event_id: { $in: ids } })
        .toArray();
      if (teams.length > 0) {
        await db.collection("comp_teams").deleteMany({ event_id: { $in: ids } });
        await handleCascadeDelete(db, "comp_teams", teams);
      }

      await db.collection("comp_groups").deleteMany({ event_id: { $in: ids } });
      await db
        .collection("league_volumes")
        .updateMany({ event_id: { $in: ids } }, { $set: { event_id: null } });

      const awards = await db
        .collection("player_awards")
        .find({ event_id: { $in: ids } })
        .toArray();
      const histRows = await db
        .collection("match_history")
        .find({ event_id: { $in: ids } })
        .toArray();

      if (awards.length > 0) {
        await db.collection("player_awards").deleteMany({ event_id: { $in: ids } });
      }
      if (histRows.length > 0) {
        await db.collection("match_history").deleteMany({ event_id: { $in: ids } });
      }
      const affectedPlayerIds = [
        ...awards.map((a) => a.player_id),
        ...histRows.map((h) => h.player_id),
      ];
      if (affectedPlayerIds.length > 0) {
        await recomputePlayerStats(db, affectedPlayerIds);
      }
      break;
    }

    case "comp_teams": {
      await db.collection("comp_team_players").deleteMany({ team_id: { $in: ids } });
      break;
    }

    case "comp_groups": {
      await db
        .collection("comp_teams")
        .updateMany({ group_id: { $in: ids } }, { $set: { group_id: null } });
      await db
        .collection("matches")
        .updateMany({ group_id: { $in: ids } }, { $set: { group_id: null } });
      break;
    }

    case "leagues": {
      const volumes = await db
        .collection("league_volumes")
        .find({ league_id: { $in: ids } })
        .toArray();
      await db.collection("league_volumes").deleteMany({ league_id: { $in: ids } });
      await handleCascadeDelete(db, "league_volumes", volumes);
      await db
        .collection("events")
        .updateMany({ league_id: { $in: ids } }, { $set: { league_id: null } });
      break;
    }

    case "league_volumes": {
      await db
        .collection("events")
        .updateMany({ league_volume_id: { $in: ids } }, { $set: { league_volume_id: null } });
      break;
    }

    case "coaching_sessions": {
      await db
        .collection("coaching_session_players")
        .deleteMany({ session_id: { $in: ids } });
      await db.collection("coaching_groups").deleteMany({ session_id: { $in: ids } });
      await db
        .collection("coaching_assessments")
        .deleteMany({ session_id: { $in: ids } });
      break;
    }

    case "coaching_groups": {
      await db
        .collection("coaching_session_players")
        .updateMany({ group_id: { $in: ids } }, { $set: { group_id: null } });
      break;
    }

    case "classes": {
      await db.collection("class_schedules").deleteMany({ class_id: { $in: ids } });
      await db.collection("class_reviews").deleteMany({ class_id: { $in: ids } });
      break;
    }

    case "class_schedules": {
      await db
        .collection("class_reviews")
        .updateMany({ schedule_id: { $in: ids } }, { $set: { schedule_id: null } });
      break;
    }

    case "players": {
      await db.collection("match_history").deleteMany({ player_id: { $in: ids } });
      await db.collection("player_awards").deleteMany({ player_id: { $in: ids } });
      await db.collection("gen_participants").deleteMany({ player_id: { $in: ids } });
      await db.collection("comp_team_players").deleteMany({ player_id: { $in: ids } });
      await db
        .collection("coaching_session_players")
        .deleteMany({ player_id: { $in: ids } });
      await db
        .collection("coaching_assessments")
        .deleteMany({ player_id: { $in: ids } });
      await db
        .collection("profiles")
        .updateMany({ player_id: { $in: ids } }, { $set: { player_id: null } });
      await db
        .collection("profiles")
        .updateMany(
          { claim_player_id: { $in: ids } },
          { $set: { claim_player_id: null } }
        );
      await db
        .collection("class_reviews")
        .updateMany({ player_id: { $in: ids } }, { $set: { player_id: null } });
      break;
    }

    case "venues": {
      await db
        .collection("events")
        .updateMany({ venue_id: { $in: ids } }, { $set: { venue_id: null } });
      await db
        .collection("sessions")
        .updateMany({ venue_id: { $in: ids } }, { $set: { venue_id: null } });
      await db
        .collection("class_schedules")
        .updateMany({ venue_id: { $in: ids } }, { $set: { venue_id: null } });
      break;
    }

    case "coaches": {
      await db
        .collection("coaching_groups")
        .updateMany({ coach_id: { $in: ids } }, { $set: { coach_id: null } });
      await db
        .collection("coaching_assessments")
        .updateMany({ coach_id: { $in: ids } }, { $set: { coach_id: null } });
      await db
        .collection("class_schedules")
        .updateMany({ coach_id: { $in: ids } }, { $set: { coach_id: null } });
      await db
        .collection("classes")
        .updateMany(
          { default_coach_id: { $in: ids } },
          { $set: { default_coach_id: null } }
        );
      break;
    }
  }
}
