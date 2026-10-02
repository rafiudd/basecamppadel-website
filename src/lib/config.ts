export const WHATSAPP_URL = process.env.NEXT_PUBLIC_WHATSAPP_URL ?? "https://wa.me/";
export const YOUTUBE_URL =
  process.env.NEXT_PUBLIC_YOUTUBE_URL ?? "https://youtube.com/@basecamppadel/live";
export const POINT_OPTIONS = ["0", "15", "30", "40", "AD"] as const;
export const LEVELS = ["Beginner", "Upper Beginner", "Intermediate", "Upper Intermediate", "Advanced"];

/** Sponsor logos shown on the OBS overlay (Starting Soon screen + live lower-third). */
export const SPONSOR_LOGOS = [
  "/images/sponsors/sponsor-1.svg",
  "/images/sponsors/sponsor-2.svg",
  "/images/sponsors/sponsor-3.svg",
];
