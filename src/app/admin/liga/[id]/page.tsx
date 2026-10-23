import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadLeagueById, loadLeagueStandings } from "@/lib/leagues";
import { AdminLigaDetailView } from "@/components/admin/liga/AdminLigaDetailView";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const league = await loadLeagueById(supabase, id);
  if (!league) return { title: "Admin · Liga" };
  return { title: `Admin · ${league.name} — Basecamp Padel` };
}

export default async function AdminLigaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const supabase = await createClient();
  const league = await loadLeagueById(supabase, id);
  if (!league) notFound();

  const standings = await loadLeagueStandings(supabase, league);

  return <AdminLigaDetailView league={league} standings={standings} createdVolume={Number(created) || null} />;
}
