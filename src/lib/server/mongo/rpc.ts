import crypto from "crypto";
import type { Db } from "mongodb";
import { getDb } from "../../mongodb.ts";
import { getSessionUser, clearSessionCookie } from "../session.ts";
import {
  applyCollectionDefaults,
  levelColorFor,
  recomputePlayerStats,
} from "./triggers.ts";
import { normalizeDoc, stageEntries } from "./utils.ts";
import { LEVEL_NAMES, type PlayerLevelName } from "../../coaching.ts";
import {
  normalizeWhatsapp,
  normalizeInstagram,
  PLAY_DURATIONS,
  PLAY_DURATION_VALUES,
  SELF_LEVELS,
  type PlayDuration,
  type SelfLevel,
} from "../../accountRules.ts";
import {
  DOMINANT_HANDS,
  COURT_POSITIONS,
  type DominantHand,
  type CourtPosition,
} from "../../database.types.ts";

async function getCallerAuth(db: Db, explicitUser?: any) {
  const user = explicitUser || (await getSessionUser());
  if (!user) return { user: null, role: null, isAdmin: false, hasAdminAccess: false };

  const adminDoc = await db.collection("admin_users").findOne({
    $or: [{ _id: user.id }, { user_id: user.id }],
  } as any);
  const role = (adminDoc?.role as "admin" | "coach" | undefined) || null;
  return {
    user,
    role,
    isAdmin: role === "admin",
    hasAdminAccess: role === "admin" || role === "coach",
  };
}

async function accountPlayerLocked(
  db: Db,
  playerId: string,
  userId: string
): Promise<boolean> {
  const locked = await db.collection("profiles").findOne({
    player_id: playerId,
    user_id: { $ne: userId },
    _id: { $ne: userId },
  } as any);
  return Boolean(locked);
}

async function accountLink(
  db: Db,
  userId: string,
  playerId: string,
  nickname: string,
  gender: string,
  whatsapp: string,
  extra?: { region?: string | null; photo_url?: string | null }
): Promise<void> {
  const existingPlayer = await db.collection("players").findOne({
    $or: [{ _id: playerId }, { id: playerId }],
  } as any);
  if (!existingPlayer) {
    throw new Error("Pemain tidak ditemukan");
  }

  const updatePlayer: Record<string, any> = {
    name: nickname || existingPlayer.name,
    gender: gender || existingPlayer.gender,
    whatsapp: existingPlayer.whatsapp || whatsapp,
    updated_at: new Date(),
  };
  if (extra?.region) updatePlayer.region = extra.region;
  if (extra?.photo_url) updatePlayer.photo_url = extra.photo_url;

  await db.collection("players").updateOne(
    { _id: existingPlayer._id },
    { $set: updatePlayer }
  );

  await db.collection("profiles").updateOne(
    { $or: [{ _id: userId }, { user_id: userId }] } as any,
    {
      $set: {
        player_id: String(existingPlayer.id || existingPlayer._id),
        claim_player_id: null,
        updated_at: new Date(),
      },
    }
  );
}

async function accountNewPlayer(
  db: Db,
  userId: string,
  nickname: string,
  gender: string,
  whatsapp: string,
  extra?: { region?: string | null; photo_url?: string | null }
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date();
  const newPlayer = applyCollectionDefaults("players", {
    _id: id,
    id,
    name: nickname,
    gender,
    whatsapp,
    ...(extra?.region ? { region: extra.region } : {}),
    ...(extra?.photo_url ? { photo_url: extra.photo_url } : {}),
    created_at: now,
    updated_at: now,
  });

  await db.collection("players").insertOne(newPlayer as any);
  await db.collection("profiles").updateOne(
    { $or: [{ _id: userId }, { user_id: userId }] } as any,
    {
      $set: {
        player_id: id,
        claim_player_id: null,
        updated_at: now,
      },
    }
  );
  return id;
}

/**
 * Executes stored procedures (RPC) on MongoDB with full parity to PostgreSQL migrations.
 */
export async function executeMongoRpc(
  functionName: string,
  args: Record<string, any> = {},
  explicitUser?: any
): Promise<{ data: any; error: any }> {
  try {
    const db = await getDb();

    switch (functionName) {
      case "coaching_set_session_status": {
        const { hasAdminAccess } = await getCallerAuth(db);
        if (!hasAdminAccess) {
          return { data: null, error: { message: "Not authorized" } };
        }
        const { p_session_id, p_status } = args;
        if (!["draft", "active", "completed"].includes(p_status)) {
          return { data: null, error: { message: "Invalid session status" } };
        }
        await db.collection("coaching_sessions").updateOne(
          { $or: [{ _id: p_session_id }, { id: p_session_id }] } as any,
          { $set: { status: p_status, updated_at: new Date() } }
        );
        return { data: null, error: null };
      }

      case "coaching_apply_level": {
        const { hasAdminAccess } = await getCallerAuth(db);
        if (!hasAdminAccess) {
          return { data: null, error: { message: "Not authorized" } };
        }
        const { p_player_id, p_level } = args;
        if (
          !LEVEL_NAMES.includes(p_level as PlayerLevelName)
        ) {
          return { data: null, error: { message: "Invalid player level" } };
        }
        await db.collection("players").updateOne(
          {
            $and: [
              { $or: [{ _id: p_player_id }, { id: p_player_id }] },
              { level_overridden: { $ne: true } },
            ],
          } as any,
          {
            $set: {
              level: p_level,
              level_color: levelColorFor(p_level),
              updated_at: new Date(),
            },
          }
        );
        return { data: null, error: null };
      }

      case "account_save_profile": {
        const { user } = await getCallerAuth(db, explicitUser || args._callerUser);
        if (!user) {
          return { data: null, error: { message: "Not signed in" } };
        }

        const v_nick = String(args.p_nickname ?? "").trim();
        const v_full_name = String(args.p_full_name ?? "").trim();
        const v_gender = String(args.p_gender ?? "").trim().toUpperCase();
        const v_wa = normalizeWhatsapp(String(args.p_whatsapp ?? ""));

        const v_region = String(args.p_region ?? "").trim() || null;

        // Hand normalization: accept "R", "L", "Kanan", "Kiri", or null
        let v_hand: string | null = String(args.p_hand ?? args.p_dominant_hand ?? "").trim() || null;
        if (v_hand === "Kanan") v_hand = "R";
        else if (v_hand === "Kiri") v_hand = "L";

        // Position normalization: accept "right", "left", "both", "Kanan (Drive)", "Kiri (Revés)", "Fleksibel", "Bebas", or null
        let v_pos: string | null = String(args.p_position ?? "").trim() || null;
        if (v_pos === "Kanan (Drive)" || v_pos === "Kanan") v_pos = "right";
        else if (v_pos === "Kiri (Revés)" || v_pos === "Kiri") v_pos = "left";
        else if (v_pos === "Fleksibel" || v_pos === "Bebas") v_pos = "both";

        const raw_ig = String(args.p_instagram ?? "").trim();
        const norm_ig = raw_ig ? normalizeInstagram(raw_ig) : "";
        if (raw_ig && norm_ig === null) {
          return { data: null, error: { message: "Username Instagram tidak valid" } };
        }
        const v_ig = norm_ig || null;

        // Play duration normalization: accept PlayDuration value, label, or common colloquial inputs
        let v_dur: string | null = String(args.p_play_duration ?? "").trim() || null;
        if (v_dur) {
          const match = PLAY_DURATIONS.find((d) => d.value === v_dur || d.label === v_dur);
          if (match) {
            v_dur = match.value;
          } else if (v_dur === "< 3 bulan") v_dur = "lt3m";
          else if (v_dur === "3-6 bulan") v_dur = "3to6m";
          else if (v_dur === "6-12 bulan") v_dur = "6to12m";
          else if (v_dur === "1-2 tahun") v_dur = "1to2y";
          else if (v_dur === "> 2 tahun") v_dur = "gt2y";
        }

        // Self level normalization: accept "Pemula", "Beginner", "Intermediate"
        let v_slevel: string | null = String(args.p_self_level ?? "").trim() || null;
        if (v_slevel === "Baru pertama" || v_slevel === "Rookie") v_slevel = "Pemula";
        else if (v_slevel === "Advanced") v_slevel = "Intermediate";

        if (!v_nick) {
          return { data: null, error: { message: "Nama panggilan wajib diisi" } };
        }
        if (v_nick.length > 40) {
          return { data: null, error: { message: "Nama panggilan maksimal 40 karakter" } };
        }
        if (v_full_name.length > 80) {
          return { data: null, error: { message: "Nama lengkap maksimal 80 karakter" } };
        }
        if (v_gender !== "M" && v_gender !== "F") {
          return { data: null, error: { message: "Pilih kategori dulu" } };
        }
        if (!v_wa) {
          return { data: null, error: { message: "Nomor WhatsApp tidak valid" } };
        }
        if (v_hand && !DOMINANT_HANDS.includes(v_hand as DominantHand)) {
          return { data: null, error: { message: "Tangan dominan tidak valid" } };
        }
        if (v_pos && !COURT_POSITIONS.includes(v_pos as CourtPosition)) {
          return { data: null, error: { message: "Posisi bermain tidak valid" } };
        }
        if (v_dur && !PLAY_DURATION_VALUES.includes(v_dur as PlayDuration)) {
          return { data: null, error: { message: "Lama bermain tidak valid" } };
        }
        if (v_slevel && !SELF_LEVELS.includes(v_slevel as SelfLevel)) {
          return { data: null, error: { message: "Level pengalaman tidak valid" } };
        }

        // Check WA uniqueness across other profiles
        const otherProfileWithWa = await db.collection("profiles").findOne({
          whatsapp: v_wa,
          user_id: { $ne: user.id },
          _id: { $ne: user.id },
        } as any);
        if (otherProfileWithWa) {
          return {
            data: null,
            error: { message: "Nomor WhatsApp sudah dipakai akun lain" },
          };
        }

        const existingProfile = await db.collection("profiles").findOne({
          $or: [{ _id: user.id }, { user_id: user.id }],
        } as any);
        const v_linked = existingProfile?.player_id || null;

        const v_remove_photo = Boolean(args.p_remove_photo);
        const v_photo_source = String(args.p_photo_source ?? "").trim();
        const v_incoming_photo = args.p_photo_url ? String(args.p_photo_url).trim() : null;

        let final_photo = existingProfile?.photo_url || null;
        if (v_remove_photo) {
          final_photo = null;
        } else if (v_incoming_photo) {
          final_photo = v_incoming_photo;
        }

        let final_photo_source = existingProfile?.photo_source || "";
        if (v_remove_photo) {
          final_photo_source = "none";
        } else if (v_photo_source) {
          final_photo_source = v_photo_source;
        }

        // Category locked check if player already has points
        if (
          v_linked &&
          existingProfile?.gender &&
          existingProfile.gender !== v_gender &&
          (await accountPlayerLocked(db, v_linked, user.id))
        ) {
          return {
            data: null,
            error: { message: "Kategori cuma bisa diubah admin karena kamu sudah punya poin." },
          };
        }

        const profileUpdate: Record<string, any> = {
          user_id: user.id,
          email: user.email,
          full_name: v_full_name || existingProfile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "",
          nickname: v_nick,
          gender: v_gender,
          whatsapp: v_wa,
          region: v_region,
          dominant_hand: v_hand,
          position: v_pos,
          instagram: v_ig,
          play_duration: v_dur,
          self_level: v_slevel,
          photo_url: final_photo,
          photo_source: final_photo_source,
          updated_at: new Date(),
        };

        await db.collection("profiles").updateOne(
          { $or: [{ _id: user.id }, { user_id: user.id }] } as any,
          {
            $set: profileUpdate,
            $setOnInsert: {
              _id: user.id,
              id: user.id,
              player_id: null,
              claim_player_id: null,
              created_at: new Date(),
            },
          },
          { upsert: true }
        );

        // Already linked -> sync edits to players
        if (v_linked) {
          const otherPlayerWithWa = await db.collection("players").findOne({
            whatsapp: v_wa,
            _id: { $ne: v_linked },
            id: { $ne: v_linked },
          } as any);
          if (otherPlayerWithWa) {
            return {
              data: null,
              error: { message: "Nomor WhatsApp sudah dipakai pemain lain" },
            };
          }

          await db.collection("players").updateOne(
            { $or: [{ _id: v_linked }, { id: v_linked }] } as any,
            {
              $set: {
                name: v_nick,
                gender: v_gender,
                whatsapp: v_wa,
                ...(v_region ? { region: v_region } : {}),
                ...(final_photo ? { photo_url: final_photo } : {}),
                updated_at: new Date(),
              },
            }
          );
          return { data: "saved", error: null };
        }

        // 1. Exact WA match -> auto-link
        const waMatch = await db
          .collection("players")
          .findOne({ whatsapp: v_wa } as any);
        if (waMatch) {
          const matchId = String(waMatch.id || waMatch._id);
          if (await accountPlayerLocked(db, matchId, user.id)) {
            return {
              data: null,
              error: { message: "Nomor WhatsApp sudah terhubung ke akun lain" },
            };
          }
          await accountLink(db, user.id, matchId, v_nick, v_gender, v_wa, {
            region: v_region,
            photo_url: final_photo,
          });
          return { data: "linked", error: null };
        }

        // 2. Case-insensitive name match -> let user choose
        const escapedNick = v_nick.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const nameCandidates = await db
          .collection("players")
          .find({
            name: { $regex: "^" + escapedNick + "$", $options: "i" },
          } as any)
          .toArray();

        let hasUnlockedCandidate = false;
        for (const cand of nameCandidates) {
          const candId = String(cand.id || cand._id);
          if (!(await accountPlayerLocked(db, candId, user.id))) {
            hasUnlockedCandidate = true;
            break;
          }
        }
        if (hasUnlockedCandidate) {
          return { data: "choose", error: null };
        }

        // 3. Brand new player
        await accountNewPlayer(db, user.id, v_nick, v_gender, v_wa, {
          region: v_region,
          photo_url: final_photo,
        });
        return { data: "created", error: null };
      }

      case "account_name_candidates": {
        const { user } = await getCallerAuth(db);
        if (!user) return { data: [], error: null };

        const profile = await db.collection("profiles").findOne({
          $or: [{ _id: user.id }, { user_id: user.id }],
        } as any);
        const nick = String(profile?.nickname ?? "").trim();
        if (!nick) return { data: [], error: null };

        const escapedNick = nick.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const players = await db
          .collection("players")
          .find({
            name: { $regex: "^" + escapedNick + "$", $options: "i" },
          } as any)
          .sort({ points: -1 })
          .toArray();

        const unlocked: any[] = [];
        for (const p of players) {
          const pid = String(p.id || p._id);
          if (!(await accountPlayerLocked(db, pid, user.id))) {
            unlocked.push({
              id: pid,
              name: p.name,
              gender: p.gender ?? null,
              level: p.level ?? "Beginner",
              points: Number(p.points ?? 0),
              wins: Number(p.wins ?? 0),
              losses: Number(p.losses ?? 0),
            });
          }
        }
        return { data: unlocked, error: null };
      }

      case "account_choose_player": {
        const { user } = await getCallerAuth(db);
        if (!user) {
          return { data: null, error: { message: "Not signed in" } };
        }

        const profile = await db.collection("profiles").findOne({
          $or: [{ _id: user.id }, { user_id: user.id }],
        } as any);
        if (!profile) {
          return {
            data: null,
            error: { message: "Simpan profil terlebih dahulu" },
          };
        }
        if (profile.player_id) {
          return { data: "already_linked", error: null };
        }

        const { p_player } = args;
        if (!p_player) {
          await accountNewPlayer(
            db,
            user.id,
            profile.nickname,
            profile.gender,
            profile.whatsapp,
            { region: profile.region, photo_url: profile.photo_url }
          );
          return { data: "created", error: null };
        }

        if (await accountPlayerLocked(db, p_player, user.id)) {
          return {
            data: null,
            error: { message: "Pemain ini sudah terhubung ke akun lain" },
          };
        }

        const targetPlayer = await db.collection("players").findOne({
          $or: [{ _id: p_player }, { id: p_player }],
        } as any);
        if (!targetPlayer) {
          return { data: null, error: { message: "Pemain tidak ditemukan" } };
        }

        if (
          targetPlayer.whatsapp &&
          targetPlayer.whatsapp !== profile.whatsapp
        ) {
          await db.collection("profiles").updateOne(
            { _id: profile._id },
            {
              $set: {
                claim_player_id: String(targetPlayer.id || targetPlayer._id),
                updated_at: new Date(),
              },
            }
          );
          return { data: "pending", error: null };
        }

        await accountLink(
          db,
          user.id,
          String(targetPlayer.id || targetPlayer._id),
          profile.nickname,
          profile.gender,
          profile.whatsapp,
          { region: profile.region, photo_url: profile.photo_url }
        );
        return { data: "linked", error: null };
      }

      case "account_resolve_claim": {
        const { isAdmin } = await getCallerAuth(db);
        if (!isAdmin) {
          return { data: null, error: { message: "Not authorized" } };
        }

        const { p_uid, p_approve } = args;
        const profile = await db.collection("profiles").findOne({
          $or: [{ _id: p_uid }, { user_id: p_uid }],
        } as any);
        if (!profile?.claim_player_id) {
          return { data: null, error: { message: "Tidak ada klaim tertunda" } };
        }

        if (await accountPlayerLocked(db, profile.claim_player_id, p_uid)) {
          return {
            data: null,
            error: { message: "Pemain sudah terhubung ke akun lain" },
          };
        }

        if (p_approve) {
          await db.collection("players").updateOne(
            {
              $or: [
                { _id: profile.claim_player_id },
                { id: profile.claim_player_id },
              ],
            } as any,
            {
              $set: {
                name: profile.nickname,
                gender: profile.gender,
                whatsapp: profile.whatsapp,
                ...(profile.photo_url ? { photo_url: profile.photo_url } : {}),
                updated_at: new Date(),
              },
            }
          );
          await db.collection("profiles").updateOne(
            { _id: profile._id },
            {
              $set: {
                player_id: profile.claim_player_id,
                claim_player_id: null,
                updated_at: new Date(),
              },
            }
          );
        } else {
          await accountNewPlayer(
            db,
            p_uid,
            profile.nickname,
            profile.gender,
            profile.whatsapp,
            { region: profile.region, photo_url: profile.photo_url }
          );
        }
        return { data: null, error: null };
      }

      case "account_set_default_photo": {
        const { user } = await getCallerAuth(db);
        if (!user) {
          return { data: null, error: { message: "Not signed in" } };
        }
        const { p_photo_url } = args;
        if (
          typeof p_photo_url !== "string" ||
          !/^\/images\/players\/default-(male|female)\.svg$/.test(p_photo_url)
        ) {
          return { data: null, error: { message: "Foto default tidak valid" } };
        }

        await db.collection("profiles").updateOne(
          { $or: [{ _id: user.id }, { user_id: user.id }] } as any,
          {
            $set: { photo_url: p_photo_url, updated_at: new Date() },
            $setOnInsert: {
              _id: user.id,
              id: user.id,
              user_id: user.id,
              email: user.email,
              created_at: new Date(),
            },
          },
          { upsert: true }
        );

        const profile = await db.collection("profiles").findOne({
          $or: [{ _id: user.id }, { user_id: user.id }],
        } as any);
        if (profile?.player_id) {
          await db.collection("players").updateOne(
            {
              $or: [{ _id: profile.player_id }, { id: profile.player_id }],
            } as any,
            { $set: { photo_url: p_photo_url, updated_at: new Date() } }
          );
        }
        return { data: null, error: null };
      }

      case "account_delete": {
        const { user } = await getCallerAuth(db);
        if (!user) {
          return { data: null, error: { message: "Not signed in" } };
        }

        const profile = await db.collection("profiles").findOne({
          $or: [{ _id: user.id }, { user_id: user.id }],
        } as any);
        const linkedPlayerId = profile?.player_id || null;

        await db
          .collection("profiles")
          .deleteOne({ $or: [{ _id: user.id }, { user_id: user.id }] } as any);
        await db
          .collection("auth_users")
          .deleteOne({ $or: [{ _id: user.id }, { id: user.id }] } as any);

        if (linkedPlayerId) {
          const [mh, pa, gp, ctp, csp, ca] = await Promise.all([
            db.collection("match_history").countDocuments({ player_id: linkedPlayerId }),
            db.collection("player_awards").countDocuments({ player_id: linkedPlayerId }),
            db
              .collection("gen_participants")
              .countDocuments({ player_id: linkedPlayerId }),
            db
              .collection("comp_team_players")
              .countDocuments({ player_id: linkedPlayerId }),
            db
              .collection("coaching_session_players")
              .countDocuments({ player_id: linkedPlayerId }),
            db
              .collection("coaching_assessments")
              .countDocuments({ player_id: linkedPlayerId }),
          ]);
          const hasActivity = mh + pa + gp + ctp + csp + ca > 0;
          if (!hasActivity) {
            await db.collection("players").deleteOne({
              $or: [{ _id: linkedPlayerId }, { id: linkedPlayerId }],
            } as any);
          } else {
            await db.collection("players").updateOne(
              { $or: [{ _id: linkedPlayerId }, { id: linkedPlayerId }] } as any,
              { $set: { whatsapp: null, updated_at: new Date() } }
            );
          }
        }

        await clearSessionCookie();
        return { data: null, error: null };
      }

      case "finalize_match": {
        const { isAdmin } = await getCallerAuth(db);
        if (!isAdmin) {
          return { data: null, error: { message: "Not authorized" } };
        }

        const { p_match_id, p_games_a, p_games_b, p_winner, p_players } = args;
        if (p_winner !== "A" && p_winner !== "B") {
          return { data: null, error: { message: "Winner must be A or B" } };
        }

        const m = await db.collection("matches").findOne({
          $or: [{ _id: p_match_id }, { id: p_match_id }],
        } as any);
        if (!m) {
          return { data: null, error: { message: "Match not found" } };
        }

        let winPts = 3;
        let lossPts = 1;
        let eventName = "Mabar";
        if (m.event_id) {
          const ev = await db.collection("events").findOne({
            $or: [{ _id: m.event_id }, { id: m.event_id }],
          } as any);
          if (ev) {
            eventName = ev.name || eventName;
            winPts = Number(ev.points?.win ?? 3);
            lossPts = Number(ev.points?.loss ?? 1);
          }
        }

        await db.collection("matches").updateOne(
          { _id: m._id },
          {
            $set: {
              games_a: Number(p_games_a),
              games_b: Number(p_games_b),
              team_a_game: String(p_games_a),
              team_b_game: String(p_games_b),
              winner: p_winner,
              is_live: false,
              timer_running: false,
              finished_at: new Date(),
              updated_at: new Date(),
            },
          }
        );

        const matchId = String(m.id || m._id);
        const oldHist = await db
          .collection("match_history")
          .find({ match_id: matchId })
          .toArray();
        await db.collection("match_history").deleteMany({ match_id: matchId });

        const affectedPlayers: string[] = oldHist
          .map((h) => h.player_id)
          .filter(Boolean);
        const now = new Date();
        const today = now.toISOString().slice(0, 10);

        if (Array.isArray(p_players)) {
          const newRows: any[] = [];
          for (const rec of p_players) {
            if (!rec?.player_id) continue;
            const won = rec.side === p_winner;
            const id = crypto.randomUUID();
            newRows.push({
              _id: id,
              id,
              player_id: rec.player_id,
              match_id: matchId,
              event_id: m.event_id || null,
              event_name: eventName,
              match_date: today,
              partner: rec.partner || "—",
              opponents: rec.opponents || "—",
              score:
                rec.side === "A"
                  ? `${p_games_a} - ${p_games_b}`
                  : `${p_games_b} - ${p_games_a}`,
              result: won ? "W" : "L",
              points_delta: won ? winPts : lossPts,
              created_at: now,
              updated_at: now,
            });
            affectedPlayers.push(rec.player_id);
          }
          if (newRows.length > 0) {
            await db.collection("match_history").insertMany(newRows);
          }
        }

        await recomputePlayerStats(db, affectedPlayers);
        return { data: null, error: null };
      }

      case "comp_set_result": {
        const { user, isAdmin } = await getCallerAuth(db);
        if (!isAdmin) {
          return { data: null, error: { message: "Not authorized" } };
        }

        const p_match_id = args.p_match_id;
        // Postgres: p_wo text default null — "A"/"B" (which side won by walkover), or null.
        const p_wo: "A" | "B" | null = args.p_wo === "A" || args.p_wo === "B" ? args.p_wo : null;

        const m = await db.collection("matches").findOne({
          $or: [{ _id: p_match_id }, { id: p_match_id }],
        } as any);
        if (!m) {
          return { data: null, error: { message: "Match kompetisi tidak ditemukan" } };
        }
        if (!m.team_a_id || !m.team_b_id) {
          return { data: null, error: { message: "Tim match ini belum lengkap" } };
        }

        const ev = await db.collection("events").findOne({
          $or: [{ _id: m.event_id }, { id: m.event_id }],
        } as any);
        if (!ev) {
          return { data: null, error: { message: "Event not found" } };
        }
        if (ev.status === "finished") {
          return { data: null, error: { message: "Event sudah selesai, skor terkunci" } };
        }

        let p_games_a = Math.max(0, Number(args.p_games_a ?? 0));
        let p_games_b = Math.max(0, Number(args.p_games_b ?? 0));
        let v_winner_id: string;
        if (p_wo === null) {
          if (p_games_a === p_games_b) {
            return { data: null, error: { message: "Skor seri tidak bisa diselesaikan" } };
          }
          v_winner_id = p_games_a > p_games_b ? m.team_a_id : m.team_b_id;
        } else {
          // A walkover's games are always logged as 0-0, matching Postgres.
          v_winner_id = p_wo === "A" ? m.team_a_id : m.team_b_id;
          p_games_a = 0;
          p_games_b = 0;
        }
        const v_winner_side = v_winner_id === m.team_a_id ? "A" : "B";
        const v_old_winner = m.winner_team_id || null;

        // Guard knockout advancement if winner changes
        if (m.next_match_id && v_old_winner && v_old_winner !== v_winner_id) {
          const nextMatch = await db.collection("matches").findOne({
            $or: [{ _id: m.next_match_id }, { id: m.next_match_id }],
          } as any);
          if (
            nextMatch &&
            (nextMatch.status !== "scheduled" ||
              Number(nextMatch.team_a_games || 0) + Number(nextMatch.team_b_games || 0) > 0)
          ) {
            return {
              data: null,
              error: {
                message: "Pemenang berubah, tapi match berikutnya sudah dimulai. Koreksi match berikutnya dulu.",
              },
            };
          }
        }

        const now = new Date();
        const matchId = String(m.id || m._id);

        // Audit log
        const logId = crypto.randomUUID();
        // comp_score_log schema (Postgres 0005): id/event_id/match_id/user_id/action/before/after/created_at.
        await db.collection("comp_score_log").insertOne({
          _id: logId,
          id: logId,
          event_id: String(ev.id || ev._id),
          match_id: matchId,
          user_id: user?.id || null,
          action: m.status === "finished" ? "correct" : "finish",
          before: {
            games_a: m.team_a_games ?? 0,
            games_b: m.team_b_games ?? 0,
            winner_team_id: v_old_winner,
            is_wo: m.is_wo ?? false,
            status: m.status ?? null,
          },
          after: {
            games_a: p_games_a,
            games_b: p_games_b,
            winner_team_id: v_winner_id,
            is_wo: p_wo !== null,
          },
          created_at: now,
        } as any);

        // Update match — field names and `status` must match the matches schema (Postgres 0005).
        await db.collection("matches").updateOne(
          { _id: m._id },
          {
            $set: {
              team_a_games: p_games_a,
              team_b_games: p_games_b,
              team_a_game: String(p_games_a),
              team_b_game: String(p_games_b),
              winner: v_winner_side,
              winner_team_id: v_winner_id,
              is_wo: p_wo !== null,
              status: "finished",
              is_live: false,
              timer_running: false,
              finished_at: now,
              updated_at: now,
            },
          }
        );

        // Flag bracket_stale if group match was corrected after bracket exists
        if (m.stage === "group" && v_old_winner !== null) {
          const hasKnockout = await db.collection("matches").findOne({
            event_id: m.event_id,
            stage: { $nin: [null, "group"] },
          } as any);
          if (hasKnockout) {
            await db.collection("events").updateOne(
              { _id: ev._id },
              { $set: { bracket_stale: true, updated_at: now } }
            );
          }
        }

        // Advance winner to next knockout match
        if (m.next_match_id && m.next_match_slot) {
          const winnerTeam = await db.collection("comp_teams").findOne({
            $or: [{ _id: v_winner_id }, { id: v_winner_id }],
          } as any);
          const winnerName = winnerTeam?.name || "TBD";
          const winnerPlayerIds = (
            await db.collection("comp_team_players").find({ team_id: v_winner_id }).sort({ slot: 1 }).toArray()
          ).map((r) => r.player_id);
          if (m.next_match_slot === "A") {
            await db.collection("matches").updateOne(
              {
                $or: [{ _id: m.next_match_id }, { id: m.next_match_id }],
              } as any,
              {
                $set: {
                  team_a_id: v_winner_id,
                  team_a_name: winnerName,
                  team_a_player_ids: winnerPlayerIds,
                  updated_at: now,
                },
              }
            );
          } else if (m.next_match_slot === "B") {
            await db.collection("matches").updateOne(
              {
                $or: [{ _id: m.next_match_id }, { id: m.next_match_id }],
              } as any,
              {
                $set: {
                  team_b_id: v_winner_id,
                  team_b_name: winnerName,
                  team_b_player_ids: winnerPlayerIds,
                  updated_at: now,
                },
              }
            );
          }
        }

        // Rebuild match_history for all 4 players — one row per player, matching the Postgres
        // INSERT exactly: session_label/opponent_label/result/points_delta/stream_url only.
        const teamPlayers = await db
          .collection("comp_team_players")
          .find({ team_id: { $in: [m.team_a_id, m.team_b_id] } })
          .toArray();
        const playerIds = teamPlayers.map((r) => r.player_id).filter(Boolean);

        await db.collection("match_history").deleteMany({ match_id: matchId });

        const STAGE_LABEL: Record<string, string> = { r16: "16 besar", qf: "8 besar", sf: "Semifinal" };
        const label = `${ev.title} · ${
          m.stage === "group" ? `Grup ${m.group_label ?? ""}` : STAGE_LABEL[m.stage] ?? "Final"
        }`;

        const newHistoryRows: any[] = teamPlayers
          .filter((tp) => tp.player_id)
          .map((tp) => {
            const hid = crypto.randomUUID();
            const onTeamA = tp.team_id === m.team_a_id;
            return {
              _id: hid,
              id: hid,
              match_id: matchId,
              player_id: tp.player_id,
              session_label: label,
              opponent_label: onTeamA ? m.team_b_name : m.team_a_name,
              result: tp.team_id === v_winner_id ? "W" : "L",
              points_delta: 0,
              stream_url: m.stream_url ?? null,
              created_at: now,
            };
          });

        if (newHistoryRows.length > 0) {
          await db.collection("match_history").insertMany(newHistoryRows);
        }

        await recomputePlayerStats(db, playerIds);
        return { data: null, error: null };
      }

      case "comp_finish_event": {
        const { isAdmin } = await getCallerAuth(db);
        if (!isAdmin) {
          return { data: null, error: { message: "Not authorized" } };
        }

        const { p_event_id, p_stages } = args;
        const ev = await db.collection("events").findOne({
          $or: [{ _id: p_event_id }, { id: p_event_id }],
        } as any);
        if (!ev) {
          return { data: null, error: { message: "Event not found" } };
        }

        if (ev.status === "finished") {
          return { data: null, error: { message: "Event sudah diselesaikan" } };
        }

        const eventId = String(ev.id || ev._id);
        const now = new Date();
        const affectedPlayerIds: string[] = [];

        // Mirrors Postgres: every staged team gets an award row, even when its stage is worth 0 points.
        for (const [teamId, stageStr] of stageEntries(p_stages)) {
          await db.collection("comp_teams").updateOne(
            {
              $and: [
                { $or: [{ _id: teamId }, { id: teamId }] },
                { event_id: eventId },
              ],
            } as any,
            { $set: { final_stage: stageStr, updated_at: now } }
          );

          const v_pts = Number(ev.points?.[stageStr] ?? 0);
          const teamPlayers = await db
            .collection("comp_team_players")
            .find({ team_id: teamId })
            .toArray();
          for (const tp of teamPlayers) {
            if (!tp.player_id) continue;
            affectedPlayerIds.push(tp.player_id);
            const existingAward = await db
              .collection("player_awards")
              .findOne({
                event_id: eventId,
                player_id: tp.player_id,
              } as any);
            if (!existingAward) {
              const aid = crypto.randomUUID();
              await db.collection("player_awards").insertOne({
                _id: aid,
                id: aid,
                event_id: eventId,
                player_id: tp.player_id,
                team_id: teamId,
                stage: stageStr,
                points: v_pts,
                created_at: now,
                updated_at: now,
              } as any);
            }
          }
        }

        await db.collection("events").updateOne(
          { _id: ev._id },
          { $set: { status: "finished", updated_at: now } }
        );

        await db.collection("matches").updateMany(
          { event_id: eventId, is_live: true } as any,
          { $set: { is_live: false, timer_running: false, updated_at: now } }
        );

        const allEventPlayers = await db
          .collection("comp_team_players")
          .find({ event_id: eventId })
          .toArray();
        for (const ep of allEventPlayers) {
          if (ep.player_id) affectedPlayerIds.push(ep.player_id);
        }

        await recomputePlayerStats(db, affectedPlayerIds);
        return { data: null, error: null };
      }

      default:
        console.error(`[MongoAdapter] Unknown RPC function: ${functionName}`);
        return {
          data: null,
          error: {
            message: `Unknown RPC function: ${functionName}`,
            code: "PGRST202",
          },
        };
    }
  } catch (err: any) {
    return {
      data: null,
      error: {
        message: err?.message || String(err),
        code: err?.code !== undefined ? String(err.code) : undefined,
      },
    };
  }
}
