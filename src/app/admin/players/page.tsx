import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlayerForm } from "@/components/admin/players/PlayerForm";
import { PlayersList } from "@/components/admin/players/PlayersList";
import { PendingClaims, type PendingClaim } from "@/components/admin/players/PendingClaims";
import { PlayerLoginManagement } from "@/components/admin/players/PlayerLoginManagement";
import { PlayerReclubLink } from "@/components/admin/players/PlayerReclubLink";

import { getAdminPlayersPage } from "@/lib/server/adminPlayers";
import { parsePlayerListQuery } from "@/lib/adminPlayersQuery";

type SearchParams = { edit?: string; new?: string; q?: string; level?: string; gender?: string; activity?: string; noAccount?: string; noPhoto?: string; sort?: string; page?: string };

export default async function PlayersAdmin({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const { edit, new: isNew } = params;
  const showForm = !!edit || isNew === "1";
  const supabase = await createClient();

  if (showForm) {
    let editing = null;
    let linkedEmail: string | null = null;
    let accountCreatedAt: string | null = null;
    if (edit) {
      const [{ data: p }, { data: prof }] = await Promise.all([
        supabase.from("players").select("*").eq("id", edit).maybeSingle(),
        supabase.from("profiles").select("email, created_at").eq("player_id", edit).maybeSingle(),
      ]);
      editing = p;
      linkedEmail = prof?.email ?? null;
      accountCreatedAt = prof?.created_at ?? null;
    }

    return (
      <div className="flex flex-col gap-5">
        <PageHeader title={editing ? editing.name : "Tambah Pemain"} back={{ href: "/admin/players", label: "Pemain" }} />
        <div className="flex flex-col gap-6">
          <PlayerForm key={editing?.id ?? "new"} player={editing || undefined} accountEmail={linkedEmail} accountCreatedAt={accountCreatedAt} />
          {editing && (
            <PlayerLoginManagement
              playerId={editing.id}
              playerName={editing.name}
              accountEmail={linkedEmail}
            />
          )}
          {editing && <PlayerReclubLink key={editing.reclub_user_id ?? "none"} player={editing} />}
        </div>
      </div>
    );
  }

  // One page of players (filters, sort and paging run in the database), plus the two small lists
  // the page needs in full: open account claims, and a slim id/name list for the merge picker.
  const query = parsePlayerListQuery(params);
  const [list, { data: claimProfiles }, { data: mergeCandidates }] = await Promise.all([
    getAdminPlayersPage(query),
    supabase.from("profiles").select("user_id, email, nickname, full_name, whatsapp, player_id, claim_player_id").not("claim_player_id", "is", null).is("player_id", null),
    supabase.from("players").select("id, name, level, region, points, photo_url").order("name"),
  ]);

  const claimedIds = [...new Set((claimProfiles ?? []).map((x) => x.claim_player_id).filter((id): id is string => !!id))];
  const { data: claimedPlayers } = claimedIds.length
    ? await supabase.from("players").select("id, name, points").in("id", claimedIds)
    : { data: [] as { id: string; name: string; points: number }[] };
  const claims: PendingClaim[] = (claimProfiles ?? []).map((x) => {
    const p = claimedPlayers?.find((pl) => pl.id === x.claim_player_id);
    return { ...x, claimed: p ? { id: p.id, name: p.name, points: p.points } : null };
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Pemain"
        actions={<Link href="/admin/players?new=1" className="btn btn-coral text-ink no-underline tracking-button whitespace-nowrap">+ Tambah Pemain</Link>}
      />
      <PendingClaims claims={claims} />
      <PlayersList {...list} query={{ ...query, page: list.page }} mergeCandidates={mergeCandidates ?? []} />
    </div>
  );
}
