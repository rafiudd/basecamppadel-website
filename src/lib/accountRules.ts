/**
 * Pure player-account rules (no imports, unit-tested with `npm test`).
 */

/** Profile photo upload limit (checked before and after the square crop). */
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

/** How long a login stays valid without coming back (session cookie max-age, seconds). */
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

/**
 * Indonesian mobile number → `628…` (what the database stores and matches on), or null when it is
 * not one. Accepts 08…, 8…, 628…, +62 8… with spaces, dashes, dots or brackets.
 */
export function normalizeWhatsapp(input: string): string | null {
  let d = input.replace(/[\s\-.()]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (!/^\d+$/.test(d)) return null;
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return /^628\d{7,11}$/.test(d) ? d : null;
}

/** `628123456789` → `0812-3456-789`, for showing a stored number. */
export function formatWhatsapp(stored: string): string {
  const local = stored.startsWith("62") ? "0" + stored.slice(2) : stored;
  return local.replace(/^(\d{4})(\d{4})(\d+)$/, "$1-$2-$3");
}

/** Only same-site paths survive as a post-login destination (no `//evil.com`, no `https://…`). */
export function safeNext(next: string | null | undefined, fallback = "/akun"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** Where a signed-in account stands: no profile yet, profile but "Ini saya?" unanswered, or done. */
export type AccountStep = "profile" | "choose" | "ready";

export function accountStep(profile: { player_id: string | null; claim_player_id: string | null } | null): AccountStep {
  if (!profile) return "profile";
  return profile.player_id || profile.claim_player_id ? "ready" : "choose";
}

/** Where a visitor at `step` (null = signed out) goes next on the way to `next`. */
export function stepPath(step: AccountStep | null, next: string): string {
  const q = `?next=${encodeURIComponent(next)}`;
  if (!step) return `/masuk${q}`;
  if (step === "profile") return `/akun/lengkapi${q}`;
  if (step === "choose") return `/akun/sambungkan${q}`;
  return next;
}

/** "Udah main padel berapa lama?" (stored key → label). */
export const PLAY_DURATIONS = [
  { value: "lt3m", label: "Kurang dari 3 bulan" },
  { value: "3to6m", label: "3–6 bulan" },
  { value: "6to12m", label: "6–12 bulan" },
  { value: "1to2y", label: "1–2 tahun" },
  { value: "gt2y", label: "Lebih dari 2 tahun" },
] as const;
export type PlayDuration = (typeof PLAY_DURATIONS)[number]["value"];

/** "Level (perkiraan sendiri)": the coach's assessment refines it later. */
export const SELF_LEVELS = ["Pemula", "Beginner", "Intermediate"] as const;
export type SelfLevel = (typeof SELF_LEVELS)[number];

/**
 * "@nadia.putri", "nadia.putri" or an instagram.com profile link → "nadia.putri"; "" when empty,
 * null when it is not a valid handle.
 */
export function normalizeInstagram(input: string): string | null {
  let s = input.trim();
  if (!s) return "";
  s = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "").replace(/^@/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(s) ? s : null;
}

/** Name and picture Google gave the account (Supabase keeps them in user_metadata). */
export function googleIdentity(meta: Record<string, unknown> | null | undefined): { name: string; avatarUrl: string | null } {
  const pick = (...keys: string[]) => keys.map((k) => meta?.[k]).find((v): v is string => typeof v === "string" && v.trim() !== "");
  const avatar = pick("avatar_url", "picture");
  return { name: pick("full_name", "name") ?? "", avatarUrl: avatar && /^https:\/\//.test(avatar) ? avatar : null };
}

/** Google profile pictures come as small thumbnails ("=s96-c"); ask for one big enough for the avatar. */
export function largeGoogleAvatar(url: string, size = 512): string {
  return /=s\d+(-c)?$/.test(url) ? url.replace(/=s\d+(-c)?$/, `=s${size}-c`) : url;
}
