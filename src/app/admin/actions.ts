"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { sessionTimeRangeToTimestamps } from "@/lib/format";
import type { Gender, Player, Serve } from "@/lib/database.types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const intOrNull = (fd: FormData, k: string) => {
  const v = str(fd, k);
  return v === "" ? null : Number(v);
};

function revalidatePublic() {
  revalidatePath("/");
  revalidatePath("/jadwal");
  revalidatePath("/leaderboard");
  revalidatePath("/leaderboard/[playerId]", "page");
}

// ---------------------------------------------------------------- sessions
export async function upsertSession(fd: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = str(fd, "id");
  const row = {
    tag: str(fd, "tag") || "Sesi Padel · Mabar",
    title: str(fd, "title"),
    venue: str(fd, "venue"),
    session_date: str(fd, "session_date"),
    time_range: str(fd, "time_range"),
    price: str(fd, "price"),
    slots: intOrNull(fd, "slots"),
    whatsapp_url: str(fd, "whatsapp_url") || null,
    published: fd.get("published") === "on",
  };
  const q = id
    ? supabase.from("sessions").update(row).eq("id", id)
    : supabase.from("sessions").insert(row);
  const { error } = await q;
  if (error) throw new Error(error.message);
  revalidatePath("/admin/sessions");
  revalidatePublic();
}

export async function deleteSession(fd: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("sessions").delete().eq("id", str(fd, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/admin/sessions");
  revalidatePublic();
}

// ---------------------------------------------------------------- players
async function uploadPhoto(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const supabase = await createClient();
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("players")
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw new Error(`Upload foto gagal: ${error.message}`);
  return supabase.storage.from("players").getPublicUrl(path).data.publicUrl;
}

export async function upsertPlayer(fd: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = str(fd, "id");
  const photo = await uploadPhoto(fd.get("photo") as File | null);
  const row: Partial<Player> & { name: string; gender: Gender } = {
    name: str(fd, "name"),
    gender: str(fd, "gender") === "F" ? "F" : "M",
    level: str(fd, "level") || "Beginner",
    region: str(fd, "region"),
    points_adjustment: Number(str(fd, "points_adjustment") || 0),
    active: fd.get("active") === "on",
  };
  if (photo) row.photo_url = photo;
  else if (fd.get("remove_photo") === "on") row.photo_url = null;

  const q = id
    ? supabase.from("players").update(row).eq("id", id)
    : supabase.from("players").insert(row);
  const { error } = await q;
  if (error) throw new Error(error.message);
  revalidatePath("/admin/players");
  revalidatePublic();
}

export async function deletePlayer(fd: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("players").delete().eq("id", str(fd, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/admin/players");
  revalidatePublic();
}

// ---------------------------------------------------------------- matches
export async function createMatch(fd: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const sessionId = str(fd, "session_id") || null;
  let session_label = "";
  let venue = "";
  let starts_at: string | null = null;
  let ends_at: string | null = null;
  if (sessionId) {
    const { data: s } = await supabase
      .from("sessions")
      .select("title, venue, session_date, time_range")
      .eq("id", sessionId)
      .maybeSingle();
    session_label = s?.title ?? "";
    venue = s?.venue ?? "";
    if (s?.session_date && s?.time_range) {
      ({ starts_at, ends_at } = sessionTimeRangeToTimestamps(s.session_date, s.time_range));
    }
  }
  const { data, error } = await supabase
    .from("matches")
    .insert({ session_id: sessionId, session_label, venue, starts_at, ends_at, status: "scheduled" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/live");
  return data.id as string;
}

export async function finalizeMatch(matchId: string, winner: Serve, winPoints: number, lossPoints: number) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("finalize_match", {
    p_match_id: matchId,
    p_winner: winner,
    p_win_points: winPoints,
    p_loss_points: lossPoints,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/live");
  revalidatePublic();
}

export async function deleteMatch(fd: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("matches").delete().eq("id", str(fd, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/admin/live");
  revalidatePublic();
}
