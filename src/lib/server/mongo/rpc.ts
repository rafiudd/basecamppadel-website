import { getDb } from "@/lib/mongodb";
import { getSessionUser, clearSessionCookie } from "../session";

/**
 * Executes stored procedures (RPC) on MongoDB.
 */
export async function executeMongoRpc(
  functionName: string,
  args: Record<string, any> = {}
): Promise<{ data: any; error: any }> {
  const db = await getDb();

  switch (functionName) {
    case "coaching_set_session_status": {
      const { p_session_id, p_status } = args;
      await db.collection("coaching_sessions").updateOne(
        { $or: [{ _id: p_session_id }, { id: p_session_id }] } as any,
        { $set: { status: p_status, updated_at: new Date() } }
      );
      return { data: null, error: null };
    }

    case "coaching_apply_level": {
      const { p_player_id, p_level } = args;
      await db.collection("players").updateOne(
        { $or: [{ _id: p_player_id }, { id: p_player_id }] } as any,
        { $set: { level: p_level, updated_at: new Date() } }
      );
      return { data: null, error: null };
    }

    case "account_save_profile": {
      const user = await getSessionUser();
      if (!user) return { data: null, error: { message: "Unauthorized" } };
      const {
        p_nickname,
        p_gender,
        p_whatsapp,
        p_region,
        p_dominant_hand,
        p_position,
        p_instagram,
        p_play_duration,
        p_self_level,
      } = args;

      const profileDoc = {
        user_id: user.id,
        email: user.email,
        nickname: p_nickname,
        gender: p_gender,
        whatsapp: p_whatsapp,
        region: p_region || "",
        dominant_hand: p_dominant_hand || null,
        position: p_position || null,
        instagram: p_instagram || "",
        play_duration: p_play_duration || null,
        self_level: p_self_level || null,
        updated_at: new Date(),
      };

      await db.collection("profiles").updateOne(
        { $or: [{ _id: user.id }, { user_id: user.id }] } as any,
        { $set: profileDoc, $setOnInsert: { created_at: new Date() } },
        { upsert: true }
      );

      // Sync name to player if linked
      const existing = await db
        .collection("profiles")
        .findOne({ $or: [{ _id: user.id }, { user_id: user.id }] } as any);
      if (existing?.player_id) {
        await db.collection("players").updateOne(
          { $or: [{ _id: existing.player_id }, { id: existing.player_id }] } as any,
          { $set: { name: p_nickname, updated_at: new Date() } }
        );
      }
      return { data: profileDoc, error: null };
    }

    case "account_choose_player": {
      const user = await getSessionUser();
      if (!user) return { data: null, error: { message: "Unauthorized" } };
      const { p_player } = args;
      await db.collection("profiles").updateOne(
        { $or: [{ _id: user.id }, { user_id: user.id }] } as any,
        { $set: { player_id: p_player, claim_player_id: null, updated_at: new Date() } }
      );
      return { data: null, error: null };
    }

    case "account_delete": {
      const user = await getSessionUser();
      if (!user) return { data: null, error: { message: "Unauthorized" } };
      await db
        .collection("profiles")
        .deleteOne({ $or: [{ _id: user.id }, { user_id: user.id }] } as any);
      await db
        .collection("auth_users")
        .deleteOne({ $or: [{ _id: user.id }, { id: user.id }] } as any);
      await clearSessionCookie();
      return { data: null, error: null };
    }

    case "account_name_candidates": {
      const user = await getSessionUser();
      const profile = user
        ? await db
            .collection("profiles")
            .findOne({ $or: [{ _id: user.id }, { user_id: user.id }] } as any)
        : null;
      const nameQuery = profile?.nickname || "";
      const candidates = await db
        .collection("players")
        .find({ name: { $regex: nameQuery, $options: "i" }, active: true })
        .limit(10)
        .toArray();
      return { data: candidates, error: null };
    }

    case "account_resolve_claim": {
      const { p_uid, p_approve } = args;
      const profile = await db
        .collection("profiles")
        .findOne({ $or: [{ _id: p_uid }, { user_id: p_uid }] } as any);
      if (profile) {
        if (p_approve) {
          await db.collection("profiles").updateOne(
            { _id: profile._id },
            { $set: { player_id: profile.claim_player_id, claim_player_id: null, updated_at: new Date() } }
          );
        } else {
          await db.collection("profiles").updateOne(
            { _id: profile._id },
            { $set: { claim_player_id: null, updated_at: new Date() } }
          );
        }
      }
      return { data: null, error: null };
    }

    case "account_set_default_photo": {
      const user = await getSessionUser();
      if (!user) return { data: null, error: { message: "Unauthorized" } };
      const { p_photo_url } = args;
      await db.collection("profiles").updateOne(
        { $or: [{ _id: user.id }, { user_id: user.id }] } as any,
        { $set: { photo_url: p_photo_url, updated_at: new Date() } }
      );
      return { data: null, error: null };
    }

    case "comp_set_result": {
      const { p_match_id, p_games_a, p_games_b, p_wo } = args;
      await db.collection("matches").updateOne(
        { $or: [{ _id: p_match_id }, { id: p_match_id }] } as any,
        {
          $set: {
            team_a_games: p_games_a,
            team_b_games: p_games_b,
            wo: p_wo || false,
            status: "finished",
            updated_at: new Date(),
          },
        }
      );
      return { data: null, error: null };
    }

    case "comp_finish_event": {
      const { p_event_id } = args;
      await db.collection("events").updateOne(
        { $or: [{ _id: p_event_id }, { id: p_event_id }] } as any,
        { $set: { status: "finished", updated_at: new Date() } }
      );
      return { data: null, error: null };
    }

    default:
      console.warn(`[MongoAdapter] Unhandled RPC: ${functionName}`);
      return { data: null, error: null };
  }
}
