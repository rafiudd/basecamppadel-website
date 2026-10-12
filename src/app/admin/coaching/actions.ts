"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrCoach, requireAdmin } from "@/lib/auth";
import { computePlayerLevel, LEVEL_DEFINITIONS, type PlayerLevelName } from "@/lib/coaching";

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

  revalidatePath("/admin/coaching");
  return { success: true, level: levelRes.level };
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

  // Update player level in players table unless explicitly overridden
  if (!player?.level_overridden) {
    await supabase
      .from("players")
      .update({
        level: levelRes.level,
        level_color: levelRes.color,
      })
      .eq("id", data.playerId);
  }

  revalidatePath("/admin/coaching");
  revalidatePath("/leaderboard");
  revalidatePath(`/leaderboard/${data.playerId}`);
  return { success: true, level: levelRes.level };
}

export async function publishAllSessionDraftsAction(sessionId: string) {
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

    await supabase
      .from("coaching_assessments")
      .update({
        status: "submitted",
        computed_level: levelRes.level,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draft.id);

    if (!player?.level_overridden) {
      await supabase
        .from("players")
        .update({
          level: levelRes.level,
          level_color: levelRes.color,
        })
        .eq("id", draft.player_id);
    }
  }

  revalidatePath("/admin/coaching");
  revalidatePath("/leaderboard");
  return { count: drafts.length };
}

export async function overridePlayerLevelAction(data: {
  sessionId?: string;
  playerId: string;
  overrideLevel: PlayerLevelName;
  overrideReason: string;
}) {
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
    await supabase
      .from("coaching_assessments")
      .update({
        override_level: data.overrideLevel,
        override_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", data.sessionId)
      .eq("player_id", data.playerId);
  }

  revalidatePath("/admin/coaching");
  revalidatePath("/admin/players");
  revalidatePath("/leaderboard");
  revalidatePath(`/leaderboard/${data.playerId}`);
  return { success: true };
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
  await requireAdminOrCoach();
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
    await supabase.from("coaching_session_players").upsert(
      {
        session_id: sessionId,
        player_id: item.playerId,
        group_id: groupId,
      },
      { onConflict: "session_id, player_id" }
    );

    // Compute level
    const levelRes = computePlayerLevel(item.scores);

    // Upsert draft assessment
    await supabase.from("coaching_assessments").upsert(
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
  }

  revalidatePath("/admin/coaching");
  return { count: items.length };
}
