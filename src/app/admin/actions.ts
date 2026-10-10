"use server";

import { guard, intOrNull, str } from "@/lib/server/action";
import type { ActionState } from "@/lib/actionState";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { uploadImage } from "@/lib/server/storage";
import type { Gender, Player } from "@/lib/database.types";
import { normalizeWhatsapp } from "@/lib/accountRules";

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
      price_per_hour: Math.max(0, Number(str(fd, "price_per_hour")) || 0),
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

/** Saves the whole day × hour price grid to every selected court at once (the admin "Harga prime
 *  time" form) — a venue whose courts share one price only needs this filled in once. Blank cells
 *  mean "use that court's base rate", so each court's grid is wiped and reinserted from the filled ones. */
export async function upsertCourtHourRates(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const venueId = str(fd, "venue_id");
    const courtIds = fd.getAll("apply_court_ids").map(String).filter(Boolean);
    if (!courtIds.length) throw new Error("Pilih minimal 1 court.");

    const cells: { day_of_week: number; hour: number; price_per_hour: number }[] = [];
    for (const key of fd.keys()) {
      const m = key.match(/^price_(\d)_(\d{1,2})$/);
      if (!m) continue;
      const v = str(fd, key);
      if (!v) continue;
      cells.push({ day_of_week: Number(m[1]), hour: Number(m[2]), price_per_hour: Math.max(0, Number(v) || 0) });
    }

    const { error: delErr } = await supabase.from("court_hour_rates").delete().in("court_id", courtIds);
    if (delErr) throw new Error(delErr.message);
    if (cells.length) {
      const rows = courtIds.flatMap((court_id) => cells.map((c) => ({ court_id, ...c })));
      const { error } = await supabase.from("court_hour_rates").insert(rows);
      if (error) throw new Error(error.message);
    }
    revalidatePath(`/admin/venues/${venueId}`);
  });
}

// ---------------------------------------------------------------- players
/** Player cutout photo (admin only: callers run requireAdmin first) → R2 under players/. */
async function uploadPhoto(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;
  return uploadImage("players", file, 5 * 1024 * 1024);
}

export async function upsertPlayer(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const id = str(fd, "id");
    const rawWa = str(fd, "whatsapp");
    const whatsapp = rawWa ? normalizeWhatsapp(rawWa) : null;
    if (rawWa && !whatsapp) throw new Error("Nomor WA tidak valid. Contoh: 0812-3456-7890.");
    const photo = await uploadPhoto(fd.get("photo") as File | null);
    const row: Partial<Player> & { name: string; gender: Gender } = {
      name: str(fd, "name"),
      gender: str(fd, "gender") === "F" ? "F" : "M",
      level: str(fd, "level") || "Beginner",
      region: str(fd, "region"),
      points_adjustment: Number(str(fd, "points_adjustment") || 0),
      active: fd.get("active") === "on",
      whatsapp,
    };
    if (photo) row.photo_url = photo;
    else if (fd.get("remove_photo") === "on") row.photo_url = null;

    const q = id
      ? supabase.from("players").update(row).eq("id", id)
      : supabase.from("players").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    // a linked account shows the same name and gender (the admin is the one who may change gender)
    if (id) {
      const { error: syncError } = await supabase.from("profiles").update({ nickname: row.name, gender: row.gender }).eq("player_id", id);
      if (syncError) throw new Error(syncError.message);
    }
    revalidatePath("/admin/players");
    revalidatePath("/akun", "layout");
    revalidatePublic();
    redirect("/admin/players");
  });
}

/** "Ini saya" claim: approve links the account to that player, reject gives it a new player. */
export async function resolveClaim(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase.rpc("account_resolve_claim", { p_uid: str(fd, "user_id"), p_approve: str(fd, "approve") === "1" });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/players");
    revalidatePath("/akun", "layout");
    revalidatePublic();
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
