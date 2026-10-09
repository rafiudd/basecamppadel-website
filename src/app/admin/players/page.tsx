import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlayerForm } from "@/components/admin/players/PlayerForm";
import { PlayersList } from "@/components/admin/players/PlayersList";
import { PendingClaims, type PendingClaim } from "@/components/admin/players/PendingClaims";

export default async function PlayersAdmin({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string }> }) {
  const { edit, new: isNew } = await searchParams;
  const supabase = await createClient();
  const [{ data: players }, { data: profiles }] = await Promise.all([
    supabase.from("players").select("*").order("points", { ascending: false }),
    supabase.from("profiles").select("user_id, email, nickname, full_name, whatsapp, player_id, claim_player_id"),
  ]);
  const editing = players?.find((p) => p.id === edit);
  const linkedEmail = editing ? profiles?.find((x) => x.player_id === editing.id)?.email ?? null : null;
  const claims: PendingClaim[] = (profiles ?? [])
    .filter((x) => x.claim_player_id && !x.player_id)
    .map((x) => {
      const p = players?.find((pl) => pl.id === x.claim_player_id);
      return { ...x, claimed: p ? { id: p.id, name: p.name, points: p.points } : null };
    });
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

      {!showForm && <PendingClaims claims={claims} />}
      {showForm ? <PlayerForm key={editing?.id ?? "new"} player={editing} accountEmail={linkedEmail} /> : <PlayersList players={players ?? []} />}
    </div>
  );
}
