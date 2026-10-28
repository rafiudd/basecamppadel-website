import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlayerForm } from "@/components/admin/players/PlayerForm";
import { PlayersList } from "@/components/admin/players/PlayersList";
import { PendingClaims, type PendingClaim } from "@/components/admin/players/PendingClaims";
import { PlayerLoginManagement } from "@/components/admin/players/PlayerLoginManagement";

import { getDb } from "@/lib/mongodb";

async function getCoachingCounts(): Promise<Record<string, number>> {
  try {
    const db = await getDb();
    const agg = await db.collection("coaching_session_players").aggregate<{ _id: string; count: number }>([
      {
        $group: {
          _id: "$player_id",
          sessions: { $addToSet: "$session_id" },
        },
      },
      {
        $project: {
          _id: 1,
          count: { $size: "$sessions" },
        },
      },
    ]).toArray();
    const result: Record<string, number> = {};
    for (const item of agg) {
      if (item._id) result[item._id] = item.count;
    }
    return result;
  } catch {
    return {};
  }
}

export default async function PlayersAdmin({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string }> }) {
  const { edit, new: isNew } = await searchParams;
  const showForm = !!edit || isNew === "1";
  const supabase = await createClient();

  if (showForm) {
    let editing = null;
    let linkedEmail: string | null = null;
    if (edit) {
      const [{ data: p }, { data: prof }] = await Promise.all([
        supabase.from("players").select("*").eq("id", edit).maybeSingle(),
        supabase.from("profiles").select("email").eq("player_id", edit).maybeSingle(),
      ]);
      editing = p;
      linkedEmail = prof?.email ?? null;
    }

    return (
      <div className="flex flex-col gap-5">
        <PageHeader title={editing ? editing.name : "Tambah Pemain"} back={{ href: "/admin/players", label: "Pemain" }} />
        <div className="flex flex-col gap-6">
          <PlayerForm key={editing?.id ?? "new"} player={editing || undefined} accountEmail={linkedEmail} />
          {editing && (
            <PlayerLoginManagement
              playerId={editing.id}
              playerName={editing.name}
              accountEmail={linkedEmail}
            />
          )}
        </div>
      </div>
    );
  }

  const [{ data: players }, { data: profiles }, coachingCounts] = await Promise.all([
    supabase.from("players").select("*").order("points", { ascending: false }),
    supabase.from("profiles").select("user_id, email, nickname, full_name, whatsapp, player_id, claim_player_id"),
    getCoachingCounts(),
  ]);

  const claims: PendingClaim[] = (profiles ?? [])
    .filter((x) => x.claim_player_id && !x.player_id)
    .map((x) => {
      const p = players?.find((pl) => pl.id === x.claim_player_id);
      return { ...x, claimed: p ? { id: p.id, name: p.name, points: p.points } : null };
    });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Pemain"
        actions={<Link href="/admin/players?new=1" className="btn btn-coral text-ink no-underline tracking-button whitespace-nowrap">+ Tambah Pemain</Link>}
      />
      <PendingClaims claims={claims} />
      <PlayersList players={players ?? []} coachingCounts={coachingCounts} />
    </div>
  );
}
