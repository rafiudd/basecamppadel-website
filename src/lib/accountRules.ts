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
