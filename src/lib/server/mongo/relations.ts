import type { Db } from "mongodb";
import { normalizeDoc } from "./utils.ts";

async function populateManyToOne(
  db: Db,
  docs: any[],
  fkField: string,
  targetCollection: string,
  targetProp: string
) {
  const ids = Array.from(new Set(docs.map((d) => d[fkField]).filter(Boolean)));
  if (ids.length === 0) {
    for (const d of docs) {
      if (d[targetProp] === undefined) d[targetProp] = null;
    }
    return;
  }

  const targetDocs = await db
    .collection(targetCollection)
    .find({ $or: [{ _id: { $in: ids } }, { id: { $in: ids } }] } as any)
    .toArray();
  const map = new Map(
    targetDocs.map((t) => [String(t.id || t._id), normalizeDoc(t)])
  );

  for (const d of docs) {
    const fkVal = d[fkField];
    d[targetProp] = fkVal ? map.get(String(fkVal)) || null : null;
  }
}

/**
 * Handles relational population (emulating Supabase foreign key joins)
 * on normalized documents returned from MongoQueryBuilder.
 */
export async function populateRelations(
  collectionName: string,
  docs: any[],
  rawFields: string,
  db: Db
): Promise<void> {
  if (!docs || docs.length === 0 || !rawFields) return;

  // 1. leagues -> point_presets (point_preset_id) & league_volumes (1-to-many)
  if (collectionName === "leagues") {
    if (rawFields.includes("point_presets")) {
      await populateManyToOne(db, docs, "point_preset_id", "point_presets", "point_presets");
    }
    if (rawFields.includes("league_volumes")) {
      const leagueIds = docs.map((d) => String(d.id || d._id)).filter(Boolean);
      const volumes = await db
        .collection("league_volumes")
        .find({ league_id: { $in: leagueIds } })
        .toArray();
      const normVolumes = volumes.map((v) => normalizeDoc(v));
      if (rawFields.includes("events") && normVolumes.length > 0) {
        await populateManyToOne(db, normVolumes, "event_id", "events", "events");
      }
      for (const d of docs) {
        const lid = String(d.id || d._id);
        d.league_volumes = normVolumes.filter((v) => v.league_id === lid);
      }
    }
  }

  // 2. league_volumes -> events (event_id)
  if (collectionName === "league_volumes" && rawFields.includes("events")) {
    await populateManyToOne(db, docs, "event_id", "events", "events");
  }

  // 3. coaching_session_players -> players (player_id)
  if (collectionName === "coaching_session_players" && rawFields.includes("players")) {
    await populateManyToOne(db, docs, "player_id", "players", "players");
  }

  // 4. coaching_groups -> coaches (coach_id)
  if (collectionName === "coaching_groups" && rawFields.includes("coaches")) {
    await populateManyToOne(db, docs, "coach_id", "coaches", "coaches");
  }

  // 5. coaching_assessments -> coaching_sessions (session_id) & coaches (coach_id)
  if (collectionName === "coaching_assessments") {
    if (rawFields.includes("coaching_sessions")) {
      await populateManyToOne(
        db,
        docs,
        "session_id",
        "coaching_sessions",
        "coaching_sessions"
      );
    }
    if (rawFields.includes("coaches")) {
      await populateManyToOne(db, docs, "coach_id", "coaches", "coaches");
    }
  }

  // 6. sessions -> venues (venue_id)
  if (collectionName === "sessions" && rawFields.includes("venues")) {
    await populateManyToOne(db, docs, "venue_id", "venues", "venues");
  }

  // 7. events -> venues (venue_id)
  if (collectionName === "events" && rawFields.includes("venues")) {
    await populateManyToOne(db, docs, "venue_id", "venues", "venues");
  }

  // 8. classes -> coaches (default_coach_id)
  if (collectionName === "classes" && rawFields.includes("coaches")) {
    await populateManyToOne(db, docs, "default_coach_id", "coaches", "coaches");
  }

  // 9. class_schedules -> coaches (coach_id), venues (venue_id), classes (class_id)
  if (collectionName === "class_schedules") {
    if (rawFields.includes("coaches")) {
      await populateManyToOne(db, docs, "coach_id", "coaches", "coaches");
    }
    if (rawFields.includes("venues")) {
      await populateManyToOne(db, docs, "venue_id", "venues", "venues");
    }
    if (rawFields.includes("classes")) {
      await populateManyToOne(db, docs, "class_id", "classes", "classes");
    }
  }

  // 10. class_reviews -> class_schedules (schedule_id), players (player_id)
  if (collectionName === "class_reviews") {
    if (rawFields.includes("class_schedules")) {
      await populateManyToOne(
        db,
        docs,
        "schedule_id",
        "class_schedules",
        "class_schedules"
      );
    }
    if (rawFields.includes("players")) {
      await populateManyToOne(db, docs, "player_id", "players", "players");
    }
  }
}
