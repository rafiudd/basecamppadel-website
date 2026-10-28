"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { guardResult } from "@/lib/server/action";
import { redirect } from "next/navigation";
import { requireAdmin, requireAdminOrCoach } from "@/lib/auth";
import { statusTab, type SessionStatus } from "@/lib/coaching";

export async function createCoachingSessionAction(data: {
  title: string;
  sessionDate: string;
  venueId?: string | null;
  venueName?: string;
  eventId?: string | null;
  defaultSkillIds: string[];
  groups: Array<{
    id?: string;
    tempId?: string;
    name: string;
    color: string;
    coachId?: string | null;
  }>;
  playerIds?: string[];
  playerAssignments?: Array<{
    playerId: string;
    groupId?: string | null;
  }>;
}) {
  return guardResult(async () => {
    await requireAdmin();
    const supabase = await createClient();

    // 1. Create session
    const { data: session, error: sErr } = await supabase
      .from("coaching_sessions")
      .insert({
        title: data.title.trim(),
        session_date: data.sessionDate,
        venue_id: data.venueId || null,
        venue_name: data.venueName || "",
        event_id: data.eventId || null,
        default_skill_ids: data.defaultSkillIds || [],
        status: "draft",
      })
      .select()
      .single();

    if (sErr || !session) throw new Error(sErr?.message || "Gagal membuat sesi");

    // 2. Create groups
    const groupIdMap = new Map<string, string>();
    const createdGroupIds: string[] = [];
    for (let i = 0; i < data.groups.length; i++) {
      const grp = data.groups[i];
      const { data: gData, error: gErr } = await supabase
        .from("coaching_groups")
        .insert({
          session_id: session.id,
          name: grp.name.trim(),
          color: grp.color || "#FFD43B",
          coach_id: grp.coachId || null,
        })
        .select()
        .single();
      if (gErr) throw new Error(gErr.message);
      createdGroupIds.push(gData.id);
      if (grp.tempId) groupIdMap.set(grp.tempId, gData.id);
      if (grp.id) groupIdMap.set(grp.id, gData.id);
      groupIdMap.set(String(i), gData.id);
    }

    // 3. Add players
    if (data.playerAssignments && data.playerAssignments.length > 0) {
      const defaultGroupId = createdGroupIds[0] || null;
      const sessionPlayerRows = data.playerAssignments.map((pa, idx) => {
        let assignedGroupId: string | null = null;
        if (pa.groupId) {
          assignedGroupId = groupIdMap.get(pa.groupId) || pa.groupId;
        }
        if (!assignedGroupId && createdGroupIds.length > 0) {
          assignedGroupId = createdGroupIds[idx % createdGroupIds.length];
        }
        return {
          session_id: session.id,
          player_id: pa.playerId,
          group_id: assignedGroupId || defaultGroupId,
        };
      });

      const { error: spErr } = await supabase
        .from("coaching_session_players")
        .upsert(sessionPlayerRows, { onConflict: "session_id, player_id" });
      if (spErr) throw new Error(spErr.message);
    } else {
      let playerIdsToAdd: string[] = data.playerIds || [];

      // If created from event, automatically fetch participants
      if (data.eventId) {
        // Check gen_participants (mabar)
        const { data: mabarParts } = await supabase
          .from("gen_participants")
          .select("player_id")
          .eq("event_id", data.eventId);

        if (mabarParts && mabarParts.length > 0) {
          playerIdsToAdd = mabarParts
            .map((p) => p.player_id)
            .filter((id): id is string => Boolean(id));
        } else {
          // Check comp_team_players
          const { data: compParts } = await supabase
            .from("comp_team_players")
            .select("player_id")
            .eq("event_id", data.eventId);
          if (compParts && compParts.length > 0) {
            playerIdsToAdd = compParts
              .map((p) => p.player_id)
              .filter((id): id is string => Boolean(id));
          }
        }
      }

      // Distribute players across groups if groups exist
      if (playerIdsToAdd.length > 0) {
        const defaultGroupId = createdGroupIds[0] || null;
        const sessionPlayerRows = playerIdsToAdd.map((pid, idx) => ({
          session_id: session.id,
          player_id: pid,
          group_id: createdGroupIds.length > 0 ? createdGroupIds[idx % createdGroupIds.length] : defaultGroupId,
        }));

        const { error: spErr } = await supabase
          .from("coaching_session_players")
          .upsert(sessionPlayerRows, { onConflict: "session_id, player_id" });
        if (spErr) throw new Error(spErr.message);
      }
    }

    revalidatePath("/admin/coaching");
    return { success: true, sessionId: session.id };
  });
}

export async function updateCoachingSessionAction(data: {
  sessionId: string;
  title: string;
  sessionDate: string;
  venueId?: string | null;
  venueName?: string;
  eventId?: string | null;
  defaultSkillIds: string[];
  status?: "draft" | "active" | "finished";
  groups: Array<{
    id?: string;
    name: string;
    color: string;
    coachId?: string | null;
  }>;
  playerAssignments: Array<{
    playerId: string;
    groupId?: string | null;
  }>;
}) {
  return guardResult(async () => {
    await requireAdmin();
    const supabase = await createClient();

    // 1. Update session
    const { error: sErr } = await supabase
      .from("coaching_sessions")
      .update({
        title: data.title.trim(),
        session_date: data.sessionDate,
        venue_id: data.venueId || null,
        venue_name: data.venueName || "",
        event_id: data.eventId || null,
        default_skill_ids: data.defaultSkillIds || [],
        status: data.status || "draft",
      })
      .eq("id", data.sessionId);

    if (sErr) throw new Error(sErr.message);

    // 2. Sync groups
    const { data: existingGroups } = await supabase
      .from("coaching_groups")
      .select("id")
      .eq("session_id", data.sessionId);

    const existingGroupIds = new Set((existingGroups || []).map((g) => g.id));
    const activeGroupIds = new Set<string>();
    const groupIdMap = new Map<string, string>();

    for (const grp of data.groups) {
      if (grp.id && existingGroupIds.has(grp.id)) {
        const { error: e1 } = await supabase
          .from("coaching_groups")
          .update({
            name: grp.name.trim(),
            color: grp.color || "#FFD43B",
            coach_id: grp.coachId || null,
          })
          .eq("id", grp.id);
        if (e1) throw new Error(e1.message);
        activeGroupIds.add(grp.id);
        groupIdMap.set(grp.id, grp.id);
      } else {
        const { data: newG, error: newGErr } = await supabase
          .from("coaching_groups")
          .insert({
            session_id: data.sessionId,
            name: grp.name.trim(),
            color: grp.color || "#FFD43B",
            coach_id: grp.coachId || null,
          })
          .select()
          .single();
        if (newGErr) throw new Error(newGErr.message);
        activeGroupIds.add(newG.id);
        if (grp.id) groupIdMap.set(grp.id, newG.id);
      }
    }

    // Delete groups not in activeGroupIds
    const toDeleteGroups = [...existingGroupIds].filter((id) => !activeGroupIds.has(id));
    if (toDeleteGroups.length > 0) {
      const { error: e2 } = await supabase.from("coaching_groups").delete().in("id", toDeleteGroups);
      if (e2) throw new Error(e2.message);
    }

    // 3. Sync player assignments
    const { error: e3 } = await supabase
      .from("coaching_session_players")
      .delete()
      .eq("session_id", data.sessionId);
    if (e3) throw new Error(e3.message);

    if (data.playerAssignments.length > 0) {
      const sessionPlayerRows = data.playerAssignments.map((p) => {
        const resolvedGroupId = p.groupId ? groupIdMap.get(p.groupId) || p.groupId : null;
        return {
          session_id: data.sessionId,
          player_id: p.playerId,
          group_id: resolvedGroupId && activeGroupIds.has(resolvedGroupId) ? resolvedGroupId : null,
        };
      });

      const { error: spErr } = await supabase
        .from("coaching_session_players")
        .insert(sessionPlayerRows);
      if (spErr) throw new Error(spErr.message);
    }

    revalidatePath("/admin/coaching");
    revalidatePath(`/admin/coaching/sessions/${data.sessionId}`);
    return { success: true, sessionId: data.sessionId };
  });
}

export async function deleteCoachingSessionAction(sessionId: string) {
  return guardResult(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase
      .from("coaching_sessions")
      .delete()
      .eq("id", sessionId);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/coaching");
    return { success: true };
  });
}

/**
 * Moves a session to Draft / Berjalan / Selesai, for admin and coach, through
 * coaching_set_session_status (0021): coaching_sessions is admin-write only under RLS. Then opens
 * the session in its new tab in the same round trip, so the old tab (no longer holding it) never
 * renders in between. Returns only on error.
 */
export async function setCoachingSessionStatusAction(sessionId: string, status: SessionStatus) {
  return guardResult(async () => {
    await requireAdminOrCoach();
    const supabase = await createClient();
    const { error } = await supabase.rpc("coaching_set_session_status", { p_session_id: sessionId, p_status: status });
    if (error) {
      const { error: updateErr } = await supabase
        .from("coaching_sessions")
        .update({ status })
        .eq("id", sessionId);
      if (updateErr) throw new Error(error.message || updateErr.message);
    }
    revalidatePath("/admin/coaching");
    revalidatePath(`/admin/coaching/sessions/${sessionId}`);
    redirect(`/admin/coaching?when=${statusTab(status)}&session=${sessionId}`);
  });
}
