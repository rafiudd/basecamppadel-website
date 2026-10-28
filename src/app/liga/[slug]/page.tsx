import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadLeagueBySlug, loadLeagueStandings } from "@/lib/leagues";
import { PublicShell } from "@/components/PublicShell";
import { PublicLigaDetailView } from "@/components/liga/PublicLigaDetailView";

const getLeague = cache(async (slug: string) => {
  const supabase = await createClient();
  return loadLeagueBySlug(supabase, slug);
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const league = await getLeague(slug);
  if (!league) return { title: "Liga — Basecamp Padel" };
  return {
    title: `${league.name} — Basecamp Padel`,
    description: league.description || `Seri kompetisi ${league.name} di Basecamp Padel.`,
  };
}

export default async function PublicLigaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const league = await getLeague(slug);
  if (!league || !league.published) notFound();

  const supabase = await createClient();
  const standings = await loadLeagueStandings(supabase, league);

  return (
    <PublicShell>
      <PublicLigaDetailView league={league} standings={standings} />
    </PublicShell>
  );
}
