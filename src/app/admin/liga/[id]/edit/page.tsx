import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadLeagueById } from "@/lib/leagues";
import { EditLigaForm } from "@/components/admin/liga/EditLigaForm";
import { PageHeader } from "@/components/ui/PageHeader";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const league = await loadLeagueById(supabase, id);
  if (!league) return { title: "Edit Liga" };
  return { title: `Edit ${league.name} — Basecamp Padel` };
}

export default async function EditLigaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [league, { data: presets }] = await Promise.all([
    loadLeagueById(supabase, id),
    supabase.from("point_presets").select("id, name").order("is_default", { ascending: false }).order("created_at"),
  ]);
  if (!league) notFound();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        back={{ href: `/admin/liga/${league.id}`, label: `Kembali ke ${league.name}` }}
        title="Edit Liga"
        description="Ubah informasi dasar liga dan status publikasi."
      />

      <EditLigaForm league={league} presets={presets ?? []} />
    </div>
  );
}
