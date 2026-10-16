import { createClient } from "@/lib/supabase/server";
import { NewLigaForm } from "@/components/admin/liga/NewLigaForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Admin · Buat Liga — Basecamp Padel" };

export default async function NewLigaPage() {
  const supabase = await createClient();
  const { data: presets } = await supabase
    .from("point_presets")
    .select("id, name")
    .order("is_default", { ascending: false })
    .order("created_at");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        back={{ href: "/admin/liga", label: "Liga" }}
        title="Buat liga"
        description="Cukup ini. Event tiap volume dibuat nanti dari halaman liga."
      />

      <NewLigaForm presets={presets ?? []} />
    </div>
  );
}
