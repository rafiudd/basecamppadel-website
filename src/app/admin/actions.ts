"use server";

import { guard, intOrNull, str } from "@/lib/server/action";
import type { ActionState } from "@/lib/actionState";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { Gender, Player } from "@/lib/database.types";

function revalidatePublic() {
  revalidatePath("/");
  revalidatePath("/jadwal");
  revalidatePath("/leaderboard");
  revalidatePath("/leaderboard/[playerId]", "page");
}

// ---------------------------------------------------------------- sessions
export async function upsertSession(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "id");
    const startTime = str(fd, "start_time");
    const endTime = str(fd, "end_time");
    const row = {
      tag: str(fd, "tag") || "Sesi Padel · Mabar",
      title: str(fd, "title"),
      venue: str(fd, "venue"),
      session_date: str(fd, "session_date"),
      time_range: endTime ? `${startTime}–${endTime}` : startTime,
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
  });
}

export async function deleteSession(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("sessions").delete().eq("id", str(fd, "id"));
    if (error) throw new Error(error.message);
    revalidatePath("/admin/sessions");
    revalidatePublic();
  });
}

// ---------------------------------------------------------------- venues
export async function upsertVenue(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "id");
    const row = {
      name: str(fd, "name"),
      active: fd.get("active") === "on",
    };
    const q = id ? supabase.from("venues").update(row).eq("id", id) : supabase.from("venues").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    revalidatePath("/admin/venues");
    redirect("/admin/venues");
  });
}

export async function deleteVenue(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("venues").delete().eq("id", str(fd, "id"));
    if (error) throw new Error(error.message);
    revalidatePath("/admin/venues");
  });
}

// ---------------------------------------------------------------- courts
export async function upsertCourt(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "id");
    const venueId = str(fd, "venue_id") || null;
    const row = {
      name: str(fd, "name"),
      venue_id: venueId,
      active: fd.get("active") === "on",
    };
    const q = id ? supabase.from("courts").update(row).eq("id", id) : supabase.from("courts").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    if (venueId) revalidatePath(`/admin/venues/${venueId}`);
    revalidatePath("/admin/live");
    if (id && venueId) redirect(`/admin/venues/${venueId}`); // leave edit mode; adding keeps the form ready for the next court
  });
}

export async function deleteCourt(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "id");
    const { data: court } = await supabase.from("courts").select("venue_id").eq("id", id).maybeSingle();
    const { error } = await supabase.from("courts").delete().eq("id", id);
    if (error) throw new Error(error.message);
    if (court?.venue_id) revalidatePath(`/admin/venues/${court.venue_id}`);
    revalidatePath("/admin/live");
  });
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

export async function upsertPlayer(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
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
    redirect("/admin/players");
  });
}

export async function deletePlayer(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("players").delete().eq("id", str(fd, "id"));
    if (error) throw new Error(error.message);
    revalidatePath("/admin/players");
    revalidatePublic();
  });
}
