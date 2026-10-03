import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { courtNameOf, loadCompetition } from "@/lib/compData";
import { matchSection } from "@/lib/compLabels";
import { PageHeader } from "@/components/ui/PageHeader";
import { QuickScoreControl } from "@/components/admin/live/QuickScoreControl";
import { FinishedNotice } from "@/components/admin/live/FinishedNotice";
import { pickCurrentMatch } from "@/components/admin/live/MatchQueue";

export default async function QuickLiveAdmin({ searchParams }: { searchParams: Promise<{ match?: string; event?: string; done?: string }> }) {
  const { match: matchId, event: eventParam, done: doneParam } = await searchParams;
  const supabase = await createClient();

  // the event: from the URL, else the event of the requested match, else the one ON AIR
  const { data: seed } = matchId
    ? await supabase.from("matches").select("event_id").eq("id", matchId).maybeSingle()
    : await supabase.from("matches").select("event_id").eq("is_live", true).not("event_id", "is", null).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  const eventId = eventParam ?? seed?.event_id ?? null;
  const data = eventId ? await loadCompetition(supabase, { id: eventId }) : null;
  const match = data ? pickCurrentMatch(data.matches, matchId) : null;
  const done = data?.matches.find((m) => m.id === doneParam && m.status === "finished") ?? null;
  const where = match ? [matchSection(match), match.court_id ? courtNameOf(data?.courts ?? [], match.court_id) : null].filter(Boolean).join(" · ") : "";

  return (
    <div className="flex flex-col gap-4 max-w-140 mx-auto w-full">
      <PageHeader
        title="Skor Cepat"
        size="md"
        actions={
          <Link href={match ? `/admin/live?event=${match.event_id ?? ""}&match=${match.id}` : "/admin/live"} className="text-sm text-snow/80 no-underline hover:text-volt">
            Kontrol lengkap →
          </Link>
        }
      />
      {done && data && (
        <FinishedNotice done={done} next={match} all={data.matches} dismissHref={`/admin/live/quick?event=${data.event.id}${match ? `&match=${match.id}` : ""}`} />
      )}
      {match && data ? (
        <>
          <div className="bg-ink-3 rounded-card px-4 py-3 flex flex-col gap-1">
            <div className="text-xs font-bold tracking-tag text-snow/70 uppercase">{data.event.title}</div>
            <div className="font-display font-bold text-base">{where || `${match.team_a_name} vs ${match.team_b_name}`}</div>
          </div>
          <QuickScoreControl key={match.id} initial={match} />
        </>
      ) : (
        !done && (
          <div className="flex flex-col gap-3 items-center text-center py-10">
            <p className="text-sm text-snow/70 m-0">Belum ada match yang ON AIR. Pilih match di halaman Live.</p>
            <Link href="/admin/live" className="btn btn-volt no-underline">Buka Live</Link>
          </div>
        )
      )}
    </div>
  );
}
