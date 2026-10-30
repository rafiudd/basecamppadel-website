import type { Db, Document } from "mongodb";
import { recomputePlayerStats } from "./mongo/triggers.ts";
import { renameInTeamName, type PlayerFootprint } from "../playerMerge.ts";

/**
 * Two player rows that are the same person → one. Everything that points at the duplicate
 * (`source`) is moved to the player that stays (`target`), then the duplicate is deleted. Deleting a
 * player instead would cascade its match history, awards and coaching away (see handleCascadeDelete).
 * Takes the raw Mongo Db so the tests can run it on an in-memory one.
 */

/** Collections whose rows belong to one player through `player_id`. */
const PLAYER_ROWS = [
  "match_history",
  "player_awards",
  "gen_participants",
  "comp_team_players",
  "coaching_session_players",
  "coaching_assessments",
  "class_participants",
  "class_comments",
  "class_reviews",
] as const;

// players and other rows keep their uuid in both _id and id
const byId = (id: string): Document => ({ $or: [{ _id: id }, { id }] });
const byIds = (ids: string[]): Document => ({ $or: [{ _id: { $in: ids } }, { id: { $in: ids } }] });
const idOf = (doc: Document) => String(doc.id ?? doc._id);

export async function playerFootprint(db: Db, playerId: string): Promise<PlayerFootprint> {
  const rows = async (name: string) => db.collection(name).find({ player_id: playerId }).toArray();
  const [history, awards, gen, comp, roster, assessments, classes, profile] = await Promise.all([
    rows("match_history"),
    rows("player_awards"),
    rows("gen_participants"),
    rows("comp_team_players"),
    rows("coaching_session_players"),
    rows("coaching_assessments"),
    rows("class_participants"),
    db.collection("profiles").findOne({ player_id: playerId }),
  ]);
  return {
    matches: history.length,
    awards: awards.length,
    events: new Set([...gen, ...comp].map((r) => r.event_id)).size,
    coachingSessions: new Set(roster.map((r) => r.session_id)).size,
    assessments: assessments.length,
    classes: classes.length,
    accountEmail: profile ? String(profile.email ?? "") || "akun tanpa email" : null,
  };
}

/**
 * Why `source` can't be merged into `target` yet. Both in the same event or coaching session would
 * leave one person twice in it, and two accounts can't share one player; the admin sorts those out
 * first (remove one from the event/session, or unlink an account).
 */
export async function mergeBlockers(db: Db, sourceId: string, targetId: string): Promise<string[]> {
  if (sourceId === targetId) return ["Pilih dua pemain yang berbeda."];
  const [source, target] = await Promise.all([db.collection("players").findOne(byId(sourceId)), db.collection("players").findOne(byId(targetId))]);
  if (!source || !target) return ["Pemain tidak ditemukan. Muat ulang halaman."];

  const out: string[] = [];
  const [sourceAccount, targetAccount] = await Promise.all([
    db.collection("profiles").findOne({ player_id: sourceId }),
    db.collection("profiles").findOne({ player_id: targetId }),
  ]);
  if (sourceAccount && targetAccount) {
    out.push(`Dua-duanya punya akun (${sourceAccount.email || "?"} dan ${targetAccount.email || "?"}). Lepas salah satu akun dulu.`);
  }

  // the same event / session on both sides, by the field that groups them
  const shared = async (collection: string, key: string) => {
    const [a, b] = await Promise.all([
      db.collection(collection).find({ player_id: sourceId }).toArray(),
      db.collection(collection).find({ player_id: targetId }).toArray(),
    ]);
    const mine = new Set(a.map((r) => r[key]).filter(Boolean));
    return [...new Set(b.map((r) => r[key]).filter((k) => mine.has(k)))] as string[];
  };
  const eventIds = [
    ...new Set([...(await shared("gen_participants", "event_id")), ...(await shared("comp_team_players", "event_id")), ...(await shared("player_awards", "event_id"))]),
  ];
  const sessionIds = [...new Set([...(await shared("coaching_session_players", "session_id")), ...(await shared("coaching_assessments", "session_id"))])];
  const titles = async (collection: string, ids: string[]) => {
    const docs = ids.length ? await db.collection(collection).find(byIds(ids)).toArray() : [];
    return ids.map((id) => docs.find((d) => idOf(d) === id)?.title || id);
  };
  if (eventIds.length) out.push(`Dua-duanya ikut event yang sama: ${(await titles("events", eventIds)).join(", ")}. Keluarkan salah satu dari event itu dulu.`);
  if (sessionIds.length) out.push(`Dua-duanya ada di sesi coaching yang sama: ${(await titles("coaching_sessions", sessionIds)).join(", ")}. Keluarkan salah satu dari sesi itu dulu.`);
  return out;
}

export type MergeResult = { targetName: string; moved: PlayerFootprint; notes: string[] };

/**
 * Moves everything of `source` to `target` and deletes `source`. Mongo here runs without
 * transactions, so each step is safe to repeat: if it stops halfway, running the merge again
 * finishes it (the duplicate is only deleted at the very end).
 */
export async function mergePlayers(db: Db, sourceId: string, targetId: string): Promise<MergeResult> {
  const blockers = await mergeBlockers(db, sourceId, targetId);
  if (blockers.length) throw new Error(blockers.join(" "));
  const players = db.collection("players");
  const source = (await players.findOne(byId(sourceId)))!;
  const target = (await players.findOne(byId(targetId)))!;
  const moved = await playerFootprint(db, sourceId);
  const notes: string[] = [];

  // 1. names copied into events: the duplicate's name becomes the real one
  const from = String(source.name ?? "");
  const to = String(target.name ?? "");
  if (from && from !== to) {
    await db.collection("gen_participants").updateMany({ player_id: sourceId, display_name: from }, { $set: { display_name: to } });
    const teamIds = (await db.collection("comp_team_players").find({ player_id: sourceId }).toArray()).map((r) => r.team_id);
    for (const team of teamIds.length ? await db.collection("comp_teams").find(byIds(teamIds)).toArray() : []) {
      await db.collection("comp_teams").updateOne({ _id: team._id }, { $set: { name: renameInTeamName(String(team.name ?? ""), from, to) } });
    }
  }

  // 2. matches list their players in arrays (and their names in team_x_name)
  const matches = await db.collection("matches").find({ $or: [{ team_a_player_ids: sourceId }, { team_b_player_ids: sourceId }] }).toArray();
  for (const m of matches) {
    const swap = (ids: unknown) => (Array.isArray(ids) ? ids.map((id) => (id === sourceId ? targetId : id)) : ids);
    await db.collection("matches").updateOne(
      { _id: m._id },
      {
        $set: {
          team_a_player_ids: swap(m.team_a_player_ids),
          team_b_player_ids: swap(m.team_b_player_ids),
          team_a_name: renameInTeamName(String(m.team_a_name ?? ""), from, to),
          team_b_name: renameInTeamName(String(m.team_b_name ?? ""), from, to),
        },
      },
    );
  }

  // 3. every row of the duplicate now belongs to the target
  for (const name of PLAYER_ROWS) {
    await db.collection(name).updateMany({ player_id: sourceId }, { $set: { player_id: targetId } });
  }
  await db.collection("profiles").updateMany({ player_id: sourceId }, { $set: { player_id: targetId } });
  await db.collection("profiles").updateMany({ claim_player_id: sourceId }, { $set: { claim_player_id: targetId } });

  // 4. what the target lacks is taken from the duplicate. WA and Reclub id are unique, so the
  // duplicate lets go first. Manual point adjustments add up, so the total points stay the same.
  const take: Record<string, unknown> = {};
  const release: Record<string, unknown> = {};
  for (const field of ["whatsapp", "reclub_user_id"] as const) {
    if (source[field] == null || source[field] === "") continue;
    release[field] = null;
    if (target[field] == null || target[field] === "") {
      take[field] = source[field];
      // the Reclub link's name label goes with it
      if (field === "reclub_user_id") Object.assign(take, { reclub_name: source.reclub_name ?? null, reclub_username: source.reclub_username ?? null });
    } else if (target[field] !== source[field]) notes.push(field === "whatsapp" ? `Nomor WA ${source.whatsapp} dibuang (pemain tujuan sudah punya nomor sendiri).` : "Tautan Reclub duplikat dibuang (pemain tujuan sudah tertaut ke akun Reclub lain).");
  }
  if (!target.photo_url && source.photo_url) take.photo_url = source.photo_url;
  if (!target.region && source.region) take.region = source.region;
  const adjustment = Number(source.points_adjustment || 0);
  if (adjustment) take.points_adjustment = Number(target.points_adjustment || 0) + adjustment;
  if (Object.keys(release).length) await players.updateOne({ _id: source._id }, { $set: release });
  if (Object.keys(take).length) await players.updateOne({ _id: target._id }, { $set: { ...take, updated_at: new Date() } });
  // right away, so a repeated merge doesn't add it twice
  if (adjustment) await players.updateOne({ _id: source._id }, { $set: { points_adjustment: 0 } });

  // 5. last: the duplicate goes (nothing points at it any more), the target's W-L and points are recounted
  await players.deleteOne({ _id: source._id });
  await recomputePlayerStats(db, [targetId]);
  return { targetName: to, moved, notes };
}
