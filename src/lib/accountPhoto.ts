import type { Supa } from "@/lib/server/action";
import { uploadImage } from "@/lib/server/storage";
import { googleIdentity, largeGoogleAvatar, PHOTO_MAX_BYTES, type PhotoSource } from "@/lib/accountRules";

type SignedInUser = { id: string; user_metadata?: Record<string, unknown> };

/**
 * A profile photo → R2 under avatars/<user id>/. `userId` must be the signed-in user's id (callers
 * take it from supabase.auth.getUser()), which is what keeps players out of each other's folders.
 */
export async function uploadAvatar(userId: string, file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;
  return uploadImage(`avatars/${userId}`, file, PHOTO_MAX_BYTES);
}

/**
 * Default profile photo (a player without one of their own): the Google account picture, copied
 * into our storage so it doesn't depend on Google's link. Read from the signed-in user, never from a
 * form. Best effort: any failure just means no photo.
 */
export async function importGoogleAvatar(user: SignedInUser): Promise<string | null> {
  const { avatarUrl } = googleIdentity(user.user_metadata);
  if (!avatarUrl) return null;
  try {
    const res = await fetch(largeGoogleAvatar(avatarUrl), { signal: AbortSignal.timeout(5000) });
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!res.ok || !type.startsWith("image/")) return null;
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > PHOTO_MAX_BYTES) return null;
    return await uploadAvatar(user.id, new File([bytes], "google", { type }));
  } catch {
    return null;
  }
}

/**
 * On login: an existing profile without a photo gets the Google picture, on the profile and on the
 * linked player (only where those are still empty), so the navbar, leaderboard and admin show it too.
 * A player who removed their photo on purpose (photo_source "none") is left alone.
 */
export async function ensureDefaultPhoto(
  supabase: Supa,
  user: SignedInUser,
  profile: { photo_url: string | null; photo_source: PhotoSource | null },
): Promise<void> {
  if (profile.photo_url || profile.photo_source === "none") return;
  const photo = await importGoogleAvatar(user);
  if (photo) await supabase.rpc("account_set_default_photo", { p_photo_url: photo });
}
