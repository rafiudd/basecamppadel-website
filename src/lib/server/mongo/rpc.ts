import crypto from "crypto";
import type { Db } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getSessionUser, clearSessionCookie } from "../session";
import {
  applyCollectionDefaults,
  levelColorFor,
  recomputePlayerStats,
} from "./triggers";
import { normalizeDoc } from "./utils";

async function getCallerAuth(db: Db) {
  const user = await getSessionUser();
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
  args: Record<string, any> = {}
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
          !["Rookie", "Beginner", "Low Bronze", "Bronze", "Silver"].includes(p_level)
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
        const { user } = await getCallerAuth(db);
        if (!user) {
          return { data: null, error: { message: "Not signed in" } };
        }

        const v_nick = String(args.p_nickname ?? "").trim();
        const v_gender = String(args.p_gender ?? "").trim().toUpperCase();
        const v_wa = String(args.p_whatsapp ?? "").replace(/\D/g, "");
        const v_region = String(args.p_region ?? "").trim() || null;
        const v_hand = String(args.p_dominant_hand ?? "").trim() || null;
        const v_pos = String(args.p_position ?? "").trim() || null;
        const v_ig =
          String(args.p_instagram ?? "")
            .trim()
            .replace(/^@+/, "") || null;
        const v_dur = String(args.p_play_duration ?? "").trim() || null;
        const v_slevel = String(args.p_self_level ?? "").trim() || null;

        if (!v_nick) {
          return { data: null, error: { message: "Nama wajib diisi" } };
        }
        if (v_gender !== "M" && v_gender !== "F") {
          return { data: null, error: { message: "Jenis kelamin wajib dipilih" } };
        }
        if (!/^(0|62)\d{8,13}$/.test(v_wa)) {
          return { data: null, error: { message: "Nomor WhatsApp tidak valid" } };
        }
        if (v_hand && !["Kanan", "Kiri", "Ambidextrous"].includes(v_hand)) {
          return { data: null, error: { message: "Tangan dominan tidak valid" } };
        }
        if (
          v_pos &&
          !["Kanan (Drive)", "Kiri (Revés)", "Fleksibel"].includes(v_pos)
        ) {
          return { data: null, error: { message: "Posisi bermain tidak valid" } };
        }
        if (
          v_dur &&
          ![
            "< 3 bulan",
            "3-6 bulan",
            "6-12 bulan",
            "1-2 tahun",
            "> 2 tahun",
          ].includes(v_dur)
        ) {
          return { data: null, error: { message: "Lama bermain tidak valid" } };
        }
        if (
          v_slevel &&
          ![
            "Baru pertama",
            "Rookie",
            "Beginner",
            "Intermediate",
            "Advanced",
          ].includes(v_slevel)
        ) {
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
        const v_photo = existingProfile?.photo_url || null;

        const profileUpdate = {
          user_id: user.id,
          email: user.email,
          nickname: v_nick,
          gender: v_gender,
          whatsapp: v_wa,
          region: v_region,
          dominant_hand: v_hand,
          position: v_pos,
          instagram: v_ig,
          play_duration: v_dur,
          self_level: v_slevel,
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
                ...(v_photo ? { photo_url: v_photo } : {}),
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
            photo_url: v_photo,
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
          photo_url: v_photo,
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
        const p_games_a = Number(args.p_games_a ?? 0);
        const p_games_b = Number(args.p_games_b ?? 0);
        const p_wo = Boolean(args.p_wo);
        const p_reason = args.p_reason || null;

        const m = await db.collection("matches").findOne({
          $or: [{ _id: p_match_id }, { id: p_match_id }],
        } as any);
        if (!m) {
          return { data: null, error: { message: "Match not found" } };
        }
        if (!m.team_a_id || !m.team_b_id) {
          return {
            data: null,
            error: { message: "Match teams are not finalized yet" },
          };
        }
        if (p_games_a < 0 || p_games_b < 0) {
          return {
            data: null,
            error: { message: "Games cannot be negative" },
          };
        }
        if (p_games_a === p_games_b) {
          return {
            data: null,
            error: { message: "Tie is not allowed; a match must have a winner" },
          };
        }
        if (
          p_wo &&
          !(
            (p_games_a === 0 && p_games_b > 0) ||
            (p_games_b === 0 && p_games_a > 0)
          )
        ) {
          return {
            data: null,
            error: { message: "WO requires one side with 0 games" },
          };
        }

        const v_winner_side = p_games_a > p_games_b ? "A" : "B";
        const v_winner_id =
          p_games_a > p_games_b ? m.team_a_id : m.team_b_id;
        const v_old_winner = m.winner_team_id || null;

        const ev = await db.collection("events").findOne({
          $or: [{ _id: m.event_id }, { id: m.event_id }],
        } as any);
        if (!ev) {
          return { data: null, error: { message: "Event not found" } };
        }

        // Guard knockout advancement if winner changes
        if (
          m.next_match_id &&
          v_old_winner &&
          v_old_winner !== v_winner_id
        ) {
          const nextMatch = await db.collection("matches").findOne({
            $or: [{ _id: m.next_match_id }, { id: m.next_match_id }],
          } as any);
          if (
            nextMatch &&
            (nextMatch.winner_team_id ||
              nextMatch.is_live ||
              Number(nextMatch.games_a || 0) > 0 ||
              Number(nextMatch.games_b || 0) > 0)
          ) {
            return {
              data: null,
              error: {
                message:
                  "Cannot change winner: next round match already started or finished",
              },
            };
          }
        }

        const now = new Date();
        const matchId = String(m.id || m._id);

        // Audit log
        const logId = crypto.randomUUID();
        await db.collection("comp_score_log").insertOne({
          _id: logId,
          id: logId,
          match_id: matchId,
          old_games_a: m.games_a ?? null,
          old_games_b: m.games_b ?? null,
          old_winner_team_id: v_old_winner,
          new_games_a: p_games_a,
          new_games_b: p_games_b,
          new_winner_team_id: v_winner_id,
          is_wo: p_wo,
          reason: p_reason,
          changed_by: user?.id || null,
          changed_at: now,
        } as any);

        // Update match
        await db.collection("matches").updateOne(
          { _id: m._id },
          {
            $set: {
              games_a: p_games_a,
              games_b: p_games_b,
              team_a_game: String(p_games_a),
              team_b_game: String(p_games_b),
              winner: v_winner_side,
              winner_team_id: v_winner_id,
              is_wo: p_wo,
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
          if (m.next_match_slot === "A") {
            await db.collection("matches").updateOne(
              {
                $or: [{ _id: m.next_match_id }, { id: m.next_match_id }],
              } as any,
              {
                $set: {
                  team_a_id: v_winner_id,
                  team_a: winnerName,
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
                  team_b: winnerName,
                  updated_at: now,
                },
              }
            );
          }
        }

        // Rebuild match_history for all 4 players
        const teamARows = await db
          .collection("comp_team_players")
          .find({ team_id: m.team_a_id })
          .sort({ slot: 1 })
          .toArray();
        const teamBRows = await db
          .collection("comp_team_players")
          .find({ team_id: m.team_b_id })
          .sort({ slot: 1 })
          .toArray();

        const [v_pa1, v_pa2] = teamARows.map((r) => r.player_id);
        const [v_pb1, v_pb2] = teamBRows.map((r) => r.player_id);
        const playerIds = [v_pa1, v_pa2, v_pb1, v_pb2].filter(Boolean);

        const playerDocs = await db
          .collection("players")
          .find({
            $or: [{ _id: { $in: playerIds } }, { id: { $in: playerIds } }],
          } as any)
          .toArray();
        const nameMap = new Map(
          playerDocs.map((p) => [String(p.id || p._id), p.name])
        );

        const v_win_pts = Number(
          ev.points?.match_win ?? ev.points?.win ?? 0
        );
        const v_loss_pts = Number(
          ev.points?.match_loss ?? ev.points?.loss ?? 0
        );

        await db.collection("match_history").deleteMany({ match_id: matchId });

        const today = now.toISOString().slice(0, 10);
        const oppBLabel = [nameMap.get(v_pb1), nameMap.get(v_pb2)]
          .filter(Boolean)
          .join(" & ");
        const oppALabel = [nameMap.get(v_pa1), nameMap.get(v_pa2)]
          .filter(Boolean)
          .join(" & ");

        const newHistoryRows: any[] = [];
        const addHist = (
          pid: string | undefined,
          partnerId: string | undefined,
          opponents: string,
          score: string,
          won: boolean
        ) => {
          if (!pid) return;
          const hid = crypto.randomUUID();
          newHistoryRows.push({
            _id: hid,
            id: hid,
            player_id: pid,
            match_id: matchId,
            event_id: String(ev.id || ev._id),
            event_name: ev.name,
            match_date: today,
            partner: (partnerId && nameMap.get(partnerId)) || "—",
            opponents: opponents || "—",
            score,
            result: won ? "W" : "L",
            points_delta: won ? v_win_pts : v_loss_pts,
            created_at: now,
            updated_at: now,
          });
        };

        addHist(
          v_pa1,
          v_pa2,
          oppBLabel,
          `${p_games_a} - ${p_games_b}`,
          v_winner_side === "A"
        );
        addHist(
          v_pa2,
          v_pa1,
          oppBLabel,
          `${p_games_a} - ${p_games_b}`,
          v_winner_side === "A"
        );
        addHist(
          v_pb1,
          v_pb2,
          oppALabel,
          `${p_games_b} - ${p_games_a}`,
          v_winner_side === "B"
        );
        addHist(
          v_pb2,
          v_pb1,
          oppALabel,
          `${p_games_b} - ${p_games_a}`,
          v_winner_side === "B"
        );

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

        const eventId = String(ev.id || ev._id);
        const now = new Date();
        const affectedPlayerIds: string[] = [];

        if (p_stages && typeof p_stages === "object") {
          for (const [teamId, stage] of Object.entries(p_stages)) {
            const stageStr = String(stage);
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
            if (v_pts > 0) {
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
                    stage: stageStr,
                    points: v_pts,
                    created_at: now,
                    updated_at: now,
                  } as any);
                }
              }
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
