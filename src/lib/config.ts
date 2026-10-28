import { LEVEL_NAMES } from "@/lib/coaching";

/** Canonical origin (no trailing slash): metadataBase, robots.txt and sitemap.xml. Set to the production domain on prod. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://basecamppadel.vercel.app").replace(/\/+$/, "");

/** Contact for players (privacy & terms pages); also the consent screen's support email. */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "padellensid@gmail.com";
export const WHATSAPP_URL = process.env.NEXT_PUBLIC_WHATSAPP_URL ?? "https://wa.me/";
export const YOUTUBE_URL =
  process.env.NEXT_PUBLIC_YOUTUBE_URL ?? "https://youtube.com/@basecamppadel/live";
export const POINT_OPTIONS = ["0", "15", "30", "40", "AD"] as const;
/** Player levels (admin player form & filters): the coaching levels, lowest first. */
export const LEVELS: readonly string[] = LEVEL_NAMES;

/** Main sponsor logos shown on the OBS overlay (Starting Soon screen + live lower-third). */
export const SPONSOR_LOGOS = [
  "/images/sponsors/mewah-jaya.jpeg",
  "/images/sponsors/kaliandra.jpeg",
];

/**
 * "Lihat demo akun" on /masuk and the /akun-demo pages: the account UI with sample data, no login.
 * Hidden unless NEXT_PUBLIC_ACCOUNT_DEMO=1 (any environment); /akun-demo is a 404 otherwise.
 */
export const ACCOUNT_DEMO = process.env.NEXT_PUBLIC_ACCOUNT_DEMO === "1";

/** Media partner logos — shown smaller, separate from the main sponsors. */
export const MEDIA_PARTNER_LOGOS = [
  "/images/sponsors/padellens.png",
];
