"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { guardResult } from "@/lib/server/action";
import { fetchReclubClubMeets, fetchReclubMeet, importReclubAvatar } from "@/lib/server/reclub";
import { matchReclubPlayers, type ReclubMatch, type ReclubParticipant } from "@/lib/reclub";
import type { Gender, Player } from "@/lib/database.types";

/** Reclub participant import for the Buat Event wizard and the coaching session form (admin only). */

/** Basecamp Padel's upcoming Reclub meets, to pick one without pasting a link. */
export async function listReclubMeetsAction() {
  return guardResult(async () => {
    await requireAdmin();
    return { meets: await fetchReclubClubMeets() };
  });
}

export type ReclubImportRow = ReclubParticipant & ReclubMatch;

/** A meet link → the meet, and each participant with the player it matches (linked, by name, or none). */
export async function previewReclubMeetAction(link: string) {
  return guardResult(async () => {
    await requireAdmin();
    const meet = await fetchReclubMeet(link);
    const supabase = await createClient();
    const { data: players, error } = await supabase.from("players").select("id, name, reclub_user_id");
    if (error) throw new Error(error.message);
    const matches = matchReclubPlayers(meet.participants, players ?? []);
    const rows: ReclubImportRow[] = meet.participants.map((p) => ({ ...p, ...(matches.get(p.reclubUserId) ?? { playerId: null, how: "none" }) }));
    return { meet: { ...meet, participants: undefined }, rows };
  });
}

/** What the admin decided per participant: an existing player, or a new one (gender is required: players are M/F). */
export type ReclubImportChoice =
  | { reclubUserId: number; playerId: string }
  | { reclubUserId: number; create: { name: string; gender: Gender } };

/**
 * Applies the admin's choices: creates the new players and links every chosen player to its Reclub
 * user, so the next import matches them directly. A Reclub user linked to some other player before
 * is moved (the admin just picked the right one). Returns the player id per Reclub user.
 */
export async function confirmReclubImportAction(choices: ReclubImportChoice[]) {
  return guardResult(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const reclubIds = choices.map((c) => c.reclubUserId);
    if (new Set(reclubIds).size !== reclubIds.length) throw new Error("Satu akun Reclub dipilih dua kali.");
    const picked = choices.flatMap((c) => ("playerId" in c ? [c.playerId] : []));
    if (new Set(picked).size !== picked.length) throw new Error("Satu pemain dipilih untuk dua akun Reclub.");

    const toCreate = choices.flatMap((c) => ("create" in c ? [c] : []));
    for (const c of toCreate) {
      if (!c.create.name.trim()) throw new Error("Nama pemain baru wajib diisi.");
      if (c.create.gender !== "M" && c.create.gender !== "F") throw new Error(`Pilih gender untuk ${c.create.name}.`);
    }

    // a chosen player may already carry another Reclub user: that would silently re-point the old link
    if (picked.length) {
      const { data: current, error } = await supabase.from("players").select("id, name, reclub_user_id").in("id", picked);
      if (error) throw new Error(error.message);
      for (const p of current ?? []) {
        const want = choices.find((c) => "playerId" in c && c.playerId === p.id)?.reclubUserId;
        if (p.reclub_user_id != null && p.reclub_user_id !== want) throw new Error(`${p.name} sudah tertaut ke akun Reclub lain.`);
      }
    }

    // free these Reclub users from the players they were linked to before (the chosen ones are
    // linked again right below), so the unique index lets the new links in
    const { error: unlinkErr } = await supabase.from("players").update({ reclub_user_id: null }).in("reclub_user_id", reclubIds);
    if (unlinkErr) throw new Error(unlinkErr.message);

    const playerIds: Record<number, string> = {};
    for (const c of choices) {
      if (!("playerId" in c)) continue;
      const { error } = await supabase.from("players").update({ reclub_user_id: c.reclubUserId }).eq("id", c.playerId);
      if (error) throw new Error(error.message);
      playerIds[c.reclubUserId] = c.playerId;
    }
    // the forms add the new players to their own lists, so they come back whole
    let newPlayers: Player[] = [];
    if (toCreate.length) {
      // only new players get the Reclub picture; an existing player's photo is never replaced
      const photos = await Promise.all(toCreate.map((c) => importReclubAvatar(c.reclubUserId)));
      const rows = toCreate.map((c, i) => ({
        id: crypto.randomUUID(),
        name: c.create.name.trim(),
        gender: c.create.gender,
        reclub_user_id: c.reclubUserId,
        photo_url: photos[i],
      }));
      const { error } = await supabase.from("players").insert(rows);
      if (error) throw new Error(error.message);
      rows.forEach((r) => (playerIds[r.reclub_user_id] = r.id));
      const { data } = await supabase.from("players").select("*").in("id", rows.map((r) => r.id));
      newPlayers = (data ?? []) as Player[];
    }

    revalidatePath("/admin/players");
    return { playerIds, newPlayers };
  });
}
