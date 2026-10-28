import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/config";

/** Rebuilt hourly so newly published leagues/classes show up without a deploy. */
export const revalidate = 3600;

type SlugRow = { slug: string | null; updated_at?: string | null };

const STATIC_PAGES: { path: string; changeFrequency: "daily" | "weekly" | "yearly"; priority: number }[] = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "/jadwal", changeFrequency: "daily", priority: 0.9 },
  { path: "/liga", changeFrequency: "weekly", priority: 0.8 },
  { path: "/kelas", changeFrequency: "weekly", priority: 0.8 },
  { path: "/leaderboard", changeFrequency: "daily", priority: 0.7 },
  { path: "/privasi", changeFrequency: "yearly", priority: 0.2 },
  { path: "/syarat", changeFrequency: "yearly", priority: 0.2 },
];

function toEntries(rows: SlugRow[] | null, base: string, priority: number): MetadataRoute.Sitemap {
  return (rows ?? [])
    .filter((r) => r.slug)
    .map((r) => ({
      url: `${SITE_URL}${base}/${encodeURIComponent(r.slug!)}`,
      lastModified: r.updated_at ? new Date(r.updated_at) : undefined,
      changeFrequency: "weekly",
      priority,
    }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  // /jadwal/[id] and /leaderboard/[playerId] still read dummy JSON — add them once they're DB-backed.
  try {
    const db = await createClient();
    const [leagues, classes] = await Promise.all([
      db.from("leagues").select("slug, updated_at").eq("published", true),
      db.from("classes").select("slug, updated_at").eq("published", true),
    ]);
    entries.push(...toEntries(leagues.data, "/liga", 0.7), ...toEntries(classes.data, "/kelas", 0.6));
  } catch (err) {
    // A DB hiccup shouldn't take the whole sitemap down — serve the static pages.
    console.error("sitemap: failed to load dynamic routes", err);
  }

  return entries;
}
