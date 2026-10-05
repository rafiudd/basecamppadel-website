import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlayerForm } from "@/components/admin/players/PlayerForm";
import { PlayersList } from "@/components/admin/players/PlayersList";

export default async function PlayersAdmin({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string }> }) {
  const { edit, new: isNew } = await searchParams;
  const supabase = await createClient();
  const { data: players } = await supabase.from("players").select("*").order("points", { ascending: false });
  const editing = players?.find((p) => p.id === edit);
  const showForm = !!editing || isNew === "1";

  return (
    <div className="flex flex-col gap-5">
      {showForm ? (
        <PageHeader title={editing ? editing.name : "Tambah Pemain"} back={{ href: "/admin/players", label: "Pemain" }} />
      ) : (
        <PageHeader
          title="Pemain"
          actions={<Link href="/admin/players?new=1" className="btn btn-coral text-ink no-underline tracking-button whitespace-nowrap">+ Tambah Pemain</Link>}
        />
      )}

      {showForm ? <PlayerForm key={editing?.id ?? "new"} player={editing} /> : <PlayersList players={players ?? []} />}
    </div>
  );
}
