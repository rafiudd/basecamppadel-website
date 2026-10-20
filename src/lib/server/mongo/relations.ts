import type { Db } from "mongodb";
import { normalizeDoc } from "./utils";

/**
 * Handles relational population (emulating Supabase foreign key joins)
 * on raw documents returned from MongoQueryBuilder.
 */
export async function populateRelations(
  collectionName: string,
  docs: any[],
  rawFields: string,
  db: Db
): Promise<void> {
  if (docs.length === 0) return;

  // 1. leagues -> point_presets (point_preset_id)
  if (rawFields.includes("point_presets") && collectionName === "leagues") {
    const presetIds = docs.map((d) => d.point_preset_id).filter(Boolean);
    if (presetIds.length > 0) {
      const presets = await db.collection("point_presets").find({
        $or: [{ _id: { $in: presetIds } }, { id: { $in: presetIds } }],
      } as any).toArray();
      const pMap = new Map(presets.map((p) => [String(p.id || p._id), p]));
      for (const d of docs) {
        const found = pMap.get(d.point_preset_id);
        d.point_presets = found ? { name: found.name } : null;
      }
    }
  }

  // 2. league_volumes -> events (event_id)
  if (rawFields.includes("events") && collectionName === "league_volumes") {
    const eventIds = docs.map((d) => d.event_id).filter(Boolean);
    if (eventIds.length > 0) {
      const events = await db.collection("events").find({
        $or: [{ _id: { $in: eventIds } }, { id: { $in: eventIds } }],
      } as any).toArray();
      const evMap = new Map(events.map((e) => [String(e.id || e._id), e]));
      for (const d of docs) {
        const ev = evMap.get(d.event_id);
        d.events = ev ? normalizeDoc(ev) : null;
      }
    }
  }

  // 3. coaching_session_players -> players (player_id)
  if (rawFields.includes("players") && collectionName === "coaching_session_players") {
    const playerIds = docs.map((d) => d.player_id).filter(Boolean);
    if (playerIds.length > 0) {
      const players = await db.collection("players").find({
        $or: [{ _id: { $in: playerIds } }, { id: { $in: playerIds } }],
      } as any).toArray();
      const pMap = new Map(players.map((p) => [String(p.id || p._id), normalizeDoc(p)]));
      for (const d of docs) {
        d.players = d.player_id ? pMap.get(d.player_id) || null : null;
      }
    }
  }

  // 4. coaching_groups -> coaches (coach_id)
  if (rawFields.includes("coaches") && collectionName === "coaching_groups") {
    const coachIds = docs.map((d) => d.coach_id).filter(Boolean);
    if (coachIds.length > 0) {
      const coaches = await db.collection("coaches").find({
        $or: [{ _id: { $in: coachIds } }, { id: { $in: coachIds } }],
      } as any).toArray();
      const cMap = new Map(coaches.map((c) => [String(c.id || c._id), normalizeDoc(c)]));
      for (const d of docs) {
        d.coaches = d.coach_id ? cMap.get(d.coach_id) || null : null;
      }
    }
  }

  // 5. coaching_assessments -> coaching_sessions (session_id)
  if (rawFields.includes("coaching_sessions") && collectionName === "coaching_assessments") {
    const sessionIds = docs.map((d) => d.session_id).filter(Boolean);
    if (sessionIds.length > 0) {
      const sessions = await db.collection("coaching_sessions").find({
        $or: [{ _id: { $in: sessionIds } }, { id: { $in: sessionIds } }],
      } as any).toArray();
      const sMap = new Map(sessions.map((s) => [String(s.id || s._id), normalizeDoc(s)]));
      for (const d of docs) {
        d.coaching_sessions = d.session_id ? sMap.get(d.session_id) || null : null;
      }
    }
  }

  // 6. sessions -> venues (venue_id)
  if (rawFields.includes("venues") && collectionName === "sessions") {
    const venueIds = docs.map((d) => d.venue_id).filter(Boolean);
    if (venueIds.length > 0) {
      const venues = await db.collection("venues").find({
        $or: [{ _id: { $in: venueIds } }, { id: { $in: venueIds } }],
      } as any).toArray();
      const vMap = new Map(venues.map((v) => [String(v.id || v._id), normalizeDoc(v)]));
      for (const d of docs) {
        d.venues = d.venue_id ? vMap.get(d.venue_id) || null : null;
      }
    }
  }
}
