"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { guard, str } from "@/lib/server/action";
import { normalizeInstagram, normalizeWhatsapp, safeNext, type PlayDuration, type SelfLevel } from "@/lib/accountRules";
import { importGoogleAvatar, uploadAvatar } from "@/lib/accountPhoto";
import type { ActionState } from "@/lib/actionState";
import type { CourtPosition, DominantHand, Gender } from "@/lib/database.types";

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesi login habis. Masuk lagi ya.");
  return { supabase, user };
}

/** Lengkapi profil (first time, `mode=setup`) and Edit profil (`mode=edit`). */
export async function saveProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const next = safeNext(str(fd, "next"));
  const mode = str(fd, "mode");
  let result = "";
  const res = await guard(async () => {
    const { supabase, user } = await signedIn();
    const whatsapp = normalizeWhatsapp(str(fd, "whatsapp"));
    if (!str(fd, "nickname")) throw new Error("Nama panggilan wajib diisi.");
    if (!str(fd, "gender")) throw new Error("Pilih kategori dulu.");
    if (!whatsapp) throw new Error("Nomor WA tidak valid. Contoh: 0812-3456-7890.");
    const instagram = normalizeInstagram(str(fd, "instagram"));
    if (instagram === null) throw new Error("Username Instagram tidak valid. Contoh: @basecamppadel.id");

    // a picked photo, else on the first save (Lengkapi profil) the Google picture as the default
    const uploaded = await uploadAvatar(user.id, fd.get("photo") as File | null);
    const { data: current } = mode === "setup" && !uploaded
      ? await supabase.from("profiles").select("photo_url").eq("user_id", user.id).maybeSingle()
      : { data: null };
    const photo = uploaded ?? (mode === "setup" && !current?.photo_url ? await importGoogleAvatar(user) : null);
    const { data, error } = await supabase.rpc("account_save_profile", {
      p_nickname: str(fd, "nickname"),
      p_gender: str(fd, "gender") as Gender,
      p_whatsapp: whatsapp,
      p_region: str(fd, "region"),
      p_hand: str(fd, "hand") as DominantHand | "",
      p_position: str(fd, "position") as CourtPosition | "",
      p_photo_url: photo,
      p_remove_photo: false,
      p_photo_source: uploaded ? "upload" : photo ? "google" : "",
      p_full_name: str(fd, "full_name"),
      p_instagram: instagram,
      p_play_duration: str(fd, "play_duration") as PlayDuration | "",
      p_self_level: str(fd, "self_level") as SelfLevel | "",
    });
    if (error) throw new Error(error.message);
    result = data ?? "";
    revalidatePath("/akun", "layout");
  });
  if (res) return res;

  if (result === "choose") redirect(`/akun/sambungkan?next=${encodeURIComponent(next)}`);
  if (result === "linked") redirect(`/akun?tersambung=1`);
  redirect(mode === "edit" ? "/akun" : next);
}

/** "Ini saya" (a legacy player id: claim, waits for an admin) or "Bukan saya" (empty: new player). */
export async function choosePlayer(_: ActionState, fd: FormData): Promise<ActionState> {
  const next = safeNext(str(fd, "next"));
  const res = await guard(async () => {
    const { supabase } = await signedIn();
    const { error } = await supabase.rpc("account_choose_player", { p_player: str(fd, "player_id") || null });
    if (error) throw new Error(error.message);
    revalidatePath("/akun", "layout");
  });
  if (res) return res;
  redirect(next);
}

export async function signOut(): Promise<ActionState> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/** Deletes the login and profile; the player row and its matches stay for the leaderboard. */
export async function deleteAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const { supabase } = await signedIn();
    if (str(fd, "confirm") !== "HAPUS") throw new Error('Ketik "HAPUS" untuk konfirmasi.');
    const { error } = await supabase.rpc("account_delete", { p_confirm: "HAPUS" });
    if (error) throw new Error(error.message);
    await supabase.auth.signOut();
  });
  if (res) return res;
  revalidatePath("/", "layout");
  redirect("/");
}
