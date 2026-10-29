import {
  decodeNuxtPayload,
  parseReclubMeetCode,
  readReclubClubMeets,
  readReclubMeet,
  reclubAvatarUrl,
  reclubClubPayloadUrl,
  reclubMeetPayloadUrl,
  ReclubFormatError,
  type ReclubClubMeet,
  type ReclubMeet,
} from "../reclub.ts";
import { uploadImage } from "./storage";

/** Same limit as a player photo uploaded in the admin player form. */
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/** Basecamp Padel's club on Reclub (reclub.co/clubs/@basecamp-padel-vyjn0v); its upcoming meets are offered for import. */
export const RECLUB_CLUB_SLUG = process.env.RECLUB_CLUB_SLUG?.trim() || "basecamp-padel-vyjn0v";

/** GET a public Reclub page payload; every failure becomes a message an admin can act on. */
async function getPayload(url: string, notFound: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; BasecampPadel/1.0)" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new Error("Reclub tidak bisa dihubungi. Coba lagi sebentar.");
  }
  if (res.status === 404) throw new Error(notFound);
  if (!res.ok) throw new Error(`Reclub membalas ${res.status}. Coba lagi sebentar.`);
  try {
    return decodeNuxtPayload(await res.json());
  } catch (e) {
    throw e instanceof ReclubFormatError ? e : new ReclubFormatError("bukan JSON");
  }
}

/** A Reclub meet link or code → the meet and its participants. */
export async function fetchReclubMeet(input: string): Promise<ReclubMeet> {
  const code = parseReclubMeetCode(input);
  if (!code) throw new Error("Link Reclub tidak valid. Contoh: https://reclub.co/m/D0DBRA");
  const payload = await getPayload(reclubMeetPayloadUrl(code), `Meet ${code} tidak ditemukan di Reclub.`);
  return readReclubMeet(payload, code);
}

/**
 * A new player's photo: their Reclub profile picture, copied to our storage (players/) so it doesn't
 * depend on Reclub's link. Best effort: no picture, or any failure, just means no photo.
 */
export async function importReclubAvatar(userId: number): Promise<string | null> {
  try {
    const res = await fetch(reclubAvatarUrl(userId), { signal: AbortSignal.timeout(5000) });
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!res.ok || !type.startsWith("image/")) return null;
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > AVATAR_MAX_BYTES) return null;
    return await uploadImage("players", new File([bytes], "reclub", { type }), AVATAR_MAX_BYTES);
  } catch {
    return null;
  }
}

/** The upcoming meets of Basecamp Padel's Reclub club. */
export async function fetchReclubClubMeets(slug = RECLUB_CLUB_SLUG): Promise<ReclubClubMeet[]> {
  return readReclubClubMeets(await getPayload(reclubClubPayloadUrl(slug), `Klub @${slug} tidak ditemukan di Reclub.`));
}
