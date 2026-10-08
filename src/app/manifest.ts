import type { MetadataRoute } from "next";

/** Installable PWA: added to the home screen, this opens standalone (no browser chrome). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Basecamp Padel",
    short_name: "Basecamp Padel",
    description: "Komunitas mabar padel — jadwal, skor live, dan leaderboard.",
    start_url: "/",
    display: "standalone",
    background_color: "#17151F",
    theme_color: "#17151F",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
