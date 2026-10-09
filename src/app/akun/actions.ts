"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { guard, str, type Supa } from "@/lib/server/action";
import { normalizeWhatsapp, PHOTO_MAX_BYTES, safeNext } from "@/lib/accountRules";
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

/** The square-cropped photo from the profile form → public URL under avatars/<user id>/. */
async function uploadAvatar(supabase: Supa, userId: string, file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (!file.type.startsWith("image/")) throw new Error("File foto harus berupa gambar.");
  if (file.size > PHOTO_MAX_BYTES) throw new Error("Foto maksimal 2 MB.");
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `avatars/${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("players").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Upload foto gagal: ${error.message}`);
  return supabase.storage.from("players").getPublicUrl(path).data.publicUrl;
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
    if (!str(fd, "gender")) throw new Error("Pilih gender dulu.");
    if (!whatsapp) throw new Error("Nomor WA tidak valid. Contoh: 0812-3456-7890.");

    const photo = await uploadAvatar(supabase, user.id, fd.get("photo") as File | null);
    const { data, error } = await supabase.rpc("account_save_profile", {
      p_nickname: str(fd, "nickname"),
      p_gender: str(fd, "gender") as Gender,
      p_whatsapp: whatsapp,
      p_region: str(fd, "region"),
      p_hand: str(fd, "hand") as DominantHand | "",
      p_position: str(fd, "position") as CourtPosition | "",
      p_photo_url: photo,
      p_remove_photo: !photo && fd.get("remove_photo") === "on",
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
