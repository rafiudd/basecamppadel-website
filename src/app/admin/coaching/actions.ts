"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { guardResult } from "@/lib/server/action";
import { requireAdminOrCoach, requireAdmin } from "@/lib/auth";
import { computePlayerLevel, LEVEL_DEFINITIONS, type PlayerLevelName } from "@/lib/coaching";
import { syncSessionStatus } from "@/lib/coaching-db";
import { sendKirimdevWhatsAppMessage, checkKirimdevStatus } from "@/lib/server/kirimdev";
import { sendBrevoEmail, generateCoachingReportEmailHtml, checkBrevoStatus } from "@/lib/server/brevo";

/**
 * Sets a player's level through coaching_apply_level (0020): players is admin-write only under RLS,
 * so a plain update from a coach matched 0 rows without an error.
 */
async function applyPlayerLevel(supabase: Awaited<ReturnType<typeof createClient>>, playerId: string, level: string) {
  const { error } = await supabase.rpc("coaching_apply_level", { p_player_id: playerId, p_level: level });
  if (error) throw new Error(error.message);
}

export async function saveAssessmentDraftAction(data: {
  sessionId: string;
  playerId: string;
  scores: Record<string, number>;
  activeSkillIds: string[];
  evaluation: string;
  nextPractice: string;
  publishedToPlayer: boolean;
  coachId?: string | null;
  groupId?: string | null;
}) {
  return guardResult(async () => {
    await requireAdminOrCoach();
    const supabase = await createClient();

    // Check if player has mabar data
    const { data: mabarCounts } = await supabase
      .from("gen_participants")
      .select("player_id")
      .eq("player_id", data.playerId);

    const { data: player } = await supabase
      .from("players")
      .select("wins, losses, level, level_overridden, level_override_reason")
      .eq("id", data.playerId)
      .single();

    const hasMabar = (mabarCounts && mabarCounts.length > 0) || ((player?.wins ?? 0) + (player?.losses ?? 0) > 0);

    const levelRes = computePlayerLevel(data.scores, {
      hasMabarData: hasMabar,
      overrideLevel: player?.level_overridden ? player.level : undefined,
      overrideReason: player?.level_override_reason ?? undefined,
      currentLevel: player?.level,
    });

    const payload = {
      session_id: data.sessionId,
      player_id: data.playerId,
      coach_id: data.coachId || null,
      group_id: data.groupId || null,
      scores: data.scores,
      active_skill_ids: data.activeSkillIds,
      evaluation: data.evaluation,
      next_practice: data.nextPractice,
      published_to_player: data.publishedToPlayer,
      status: "draft" as const,
      computed_level: levelRes.level,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("coaching_assessments")
      .upsert(payload, { onConflict: "session_id, player_id" });

    if (error) throw new Error(error.message);
    await syncSessionStatus(supabase, data.sessionId);

    // Note: Do not revalidatePath here so auto-save is a fast, quiet background write
    // that doesn't trigger Next.js page re-renders or router reload while typing.
    return { success: true, level: levelRes.level };
  });
}

export async function submitAssessmentAction(data: {
  sessionId: string;
  playerId: string;
  scores: Record<string, number>;
  activeSkillIds: string[];
  evaluation: string;
  nextPractice: string;
  publishedToPlayer: boolean;
  coachId?: string | null;
  groupId?: string | null;
}) {
  return guardResult(async () => {
    await requireAdminOrCoach();
    const supabase = await createClient();

    const { data: mabarCounts } = await supabase
      .from("gen_participants")
      .select("player_id")
      .eq("player_id", data.playerId);

    const { data: player } = await supabase
      .from("players")
      .select("wins, losses, level, level_overridden, level_override_reason")
      .eq("id", data.playerId)
      .single();

    const hasMabar = (mabarCounts && mabarCounts.length > 0) || ((player?.wins ?? 0) + (player?.losses ?? 0) > 0);

    const levelRes = computePlayerLevel(data.scores, {
      hasMabarData: hasMabar,
      overrideLevel: player?.level_overridden ? player.level : undefined,
      overrideReason: player?.level_override_reason ?? undefined,
      currentLevel: player?.level,
    });

    const payload = {
      session_id: data.sessionId,
      player_id: data.playerId,
      coach_id: data.coachId || null,
      group_id: data.groupId || null,
      scores: data.scores,
      active_skill_ids: data.activeSkillIds,
      evaluation: data.evaluation,
      next_practice: data.nextPractice,
      published_to_player: data.publishedToPlayer,
      status: "submitted" as const,
      computed_level: levelRes.level,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("coaching_assessments")
      .upsert(payload, { onConflict: "session_id, player_id" });

    if (error) throw new Error(error.message);

    // Update player level unless explicitly overridden
    if (!player?.level_overridden) await applyPlayerLevel(supabase, data.playerId, levelRes.level);
    await syncSessionStatus(supabase, data.sessionId);

    revalidatePath("/admin/coaching");
    revalidatePath("/leaderboard");
    revalidatePath(`/leaderboard/${data.playerId}`);
    return { success: true, level: levelRes.level };
  });
}

export async function publishAllSessionDraftsAction(sessionId: string) {
  return guardResult(async () => {
    await requireAdminOrCoach();
    const supabase = await createClient();

    const { data: drafts, error } = await supabase
      .from("coaching_assessments")
      .select("*")
      .eq("session_id", sessionId)
      .eq("status", "draft");

    if (error) throw new Error(error.message);
    if (!drafts || drafts.length === 0) return { count: 0 };

    for (const draft of drafts) {
      const scores = (draft.scores as Record<string, number>) || {};
      const { data: player } = await supabase
        .from("players")
        .select("wins, losses, level, level_overridden, level_override_reason")
        .eq("id", draft.player_id)
        .single();

      const { data: mabarCounts } = await supabase
        .from("gen_participants")
        .select("player_id")
        .eq("player_id", draft.player_id);

      const hasMabar = (mabarCounts && mabarCounts.length > 0) || ((player?.wins ?? 0) + (player?.losses ?? 0) > 0);

      const levelRes = computePlayerLevel(scores, {
        hasMabarData: hasMabar,
        overrideLevel: player?.level_overridden ? player.level : undefined,
        overrideReason: player?.level_override_reason ?? undefined,
        currentLevel: player?.level,
      });

      const { error: e2 } = await supabase
        .from("coaching_assessments")
        .update({
          status: "submitted",
          computed_level: levelRes.level,
          updated_at: new Date().toISOString(),
        })
        .eq("id", draft.id);
      if (e2) throw new Error(e2.message);

      if (!player?.level_overridden) await applyPlayerLevel(supabase, draft.player_id, levelRes.level);
    }

    await syncSessionStatus(supabase, sessionId);

    revalidatePath("/admin/coaching");
    revalidatePath("/leaderboard");
    return { count: drafts.length };
  });
}

export async function overridePlayerLevelAction(data: {
  sessionId?: string;
  playerId: string;
  overrideLevel: PlayerLevelName;
  overrideReason: string;
}) {
  return guardResult(async () => {
    await requireAdmin(); // Admin only
    const reason = data.overrideReason.trim();
    if (!reason) {
      throw new Error("Alasan override level wajib diisi.");
    }

    const supabase = await createClient();
    const color = LEVEL_DEFINITIONS[data.overrideLevel]?.color || "#FFD43B";

    // Update players table
    const { error: pErr } = await supabase
      .from("players")
      .update({
        level: data.overrideLevel,
        level_color: color,
        level_overridden: true,
        level_override_reason: reason,
      })
      .eq("id", data.playerId);

    if (pErr) throw new Error(pErr.message);

    // If sessionId is provided, also record in assessment
    if (data.sessionId) {
      const { error: e4 } = await supabase
        .from("coaching_assessments")
        .update({
          override_level: data.overrideLevel,
          override_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("session_id", data.sessionId)
        .eq("player_id", data.playerId);
      if (e4) throw new Error(e4.message);
    }

    revalidatePath("/admin/coaching");
    revalidatePath("/admin/players");
    revalidatePath("/leaderboard");
    revalidatePath(`/leaderboard/${data.playerId}`);
    return { success: true };
  });
}


// ------------------------------------------------ Import Excel Drafts
export async function importRekapDraftsAction(params: {
  sessionId: string;
  items: Array<{
    playerId: string;
    scores: Record<string, number>;
    evaluation: string;
    nextPractice: string;
    groupName?: string;
    coachName?: string;
  }>;
}) {
  return guardResult(async () => {
    await requireAdmin(); // writes coaching_session_players, which RLS keeps admin-only
    const supabase = await createClient();

    const { sessionId, items } = params;
    if (!items || items.length === 0) return { count: 0 };

    // Fetch groups for this session
    const { data: groups } = await supabase
      .from("coaching_groups")
      .select("id, name, coach_id")
      .eq("session_id", sessionId);

    const groupMap = new Map((groups || []).map((g) => [g.name.toLowerCase().trim(), g]));

    // Ensure all players are in coaching_session_players
    for (const item of items) {
      let groupId: string | null = null;
      let coachId: string | null = null;

      if (item.groupName) {
        const g = groupMap.get(item.groupName.toLowerCase().trim());
        if (g) {
          groupId = g.id;
          coachId = g.coach_id;
        }
      }

      // Upsert session player
      const { error: e5 } = await supabase.from("coaching_session_players").upsert(
        {
          session_id: sessionId,
          player_id: item.playerId,
          group_id: groupId,
        },
        { onConflict: "session_id, player_id" }
      );
      if (e5) throw new Error(e5.message);

      // Compute level
      const levelRes = computePlayerLevel(item.scores);

      // Upsert draft assessment
      const { error: e6 } = await supabase.from("coaching_assessments").upsert(
        {
          session_id: sessionId,
          player_id: item.playerId,
          coach_id: coachId,
          group_id: groupId,
          scores: item.scores,
          active_skill_ids: Object.keys(item.scores),
          evaluation: item.evaluation || "",
          next_practice: item.nextPractice || "",
          published_to_player: true,
          status: "draft",
          computed_level: levelRes.level,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "session_id, player_id" }
      );
      if (e6) throw new Error(e6.message);
    }

    await syncSessionStatus(supabase, sessionId);

    revalidatePath("/admin/coaching");
    return { count: items.length };
  });
}

export async function updatePlayerContactAction(data: {
  playerId: string;
  whatsapp?: string | null;
}) {
  return guardResult(async () => {
    await requireAdminOrCoach();
    const supabase = await createClient();

    let cleanWhatsapp: string | null = null;
    if (data.whatsapp) {
      cleanWhatsapp = data.whatsapp.replace(/[^0-9]/g, "");
      if (cleanWhatsapp.startsWith("0")) {
        cleanWhatsapp = "62" + cleanWhatsapp.slice(1);
      }
    }

    const { error } = await supabase
      .from("players")
      .update({
        whatsapp: cleanWhatsapp,
      })
      .eq("id", data.playerId);

    if (error) throw new Error(error.message);

    revalidatePath("/admin/coaching");
    return { success: true };
  });
}

export async function sendCoachingReportWhatsAppAction(data: {
  playerId: string;
  whatsapp: string;
  message: string;
  sessionId?: string;
}) {
  return guardResult(async () => {
    await requireAdminOrCoach();
    const supabase = await createClient();

    let cleanWhatsapp: string | null = null;
    if (data.whatsapp?.trim()) {
      cleanWhatsapp = data.whatsapp.replace(/[^0-9]/g, "");
      if (cleanWhatsapp.startsWith("0")) {
        cleanWhatsapp = "62" + cleanWhatsapp.slice(1);
      }
      try {
        await supabase
          .from("players")
          .update({ whatsapp: cleanWhatsapp })
          .eq("id", data.playerId);
      } catch {
        // non-blocking
      }
    }

    const result = await sendKirimdevWhatsAppMessage({
      to: cleanWhatsapp || data.whatsapp,
      message: data.message,
      previewUrl: true,
    });

    if (!result.success) {
      throw new Error(result.error || "Gagal mengirim pesan melalui provider WhatsApp Kirimdev.");
    }

    if (data.sessionId) {
      revalidatePath("/admin/coaching");
    }

    return {
      success: true,
      messageId: result.messageId,
    };
  });
}

export async function getKirimdevConfigStatusAction() {
  return guardResult(async () => {
    await requireAdminOrCoach();
    return await checkKirimdevStatus();
  });
}

export async function sendCoachingReportEmailAction(data: {
  playerId: string;
  email: string;
  playerName?: string;
  sessionTitle?: string;
  evaluation?: string;
  nextPractice?: string;
  message?: string;
  sessionId?: string;
}) {
  return guardResult(async () => {
    await requireAdminOrCoach();

    const subject = `Catatan Coaching & Rapor — Basecamp Padel${data.sessionTitle ? ` (${data.sessionTitle})` : ""}`;
    const htmlContent = generateCoachingReportEmailHtml({
      playerName: data.playerName,
      sessionTitle: data.sessionTitle,
      evaluation: data.evaluation,
      nextPractice: data.nextPractice,
    });

    const result = await sendBrevoEmail({
      to: {
        email: data.email,
        name: data.playerName,
      },
      subject,
      htmlContent,
      textContent: data.message,
    });

    if (!result.success) {
      throw new Error(result.error || "Gagal mengirim email via Brevo.");
    }

    if (data.sessionId) {
      revalidatePath("/admin/coaching");
    }

    return {
      success: true,
      messageId: result.messageId,
    };
  });
}

export async function getBrevoConfigStatusAction() {
  return guardResult(async () => {
    await requireAdminOrCoach();
    return await checkBrevoStatus();
  });
}

