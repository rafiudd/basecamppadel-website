import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/auth";
import { courtLabel } from "@/lib/format";
import { courtNameOf, loadCompetition } from "@/lib/compData";
import { matchName } from "@/lib/compLabels";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PhoneIcon } from "@/components/ui/icons";
import { LiveControl } from "@/components/admin/live/LiveControl";
import { LiveEventBar, type EventLiveSummary } from "@/components/admin/live/LiveEventBar";
import { MatchQueue, pickCurrentMatch } from "@/components/admin/live/MatchQueue";
import { NoRunningEvent } from "@/components/admin/live/NoRunningEvent";
import { FinishedNotice } from "@/components/admin/live/FinishedNotice";
import { StartFreeformButton } from "@/components/admin/live/StartFreeformForm";
import type { CompEvent, Court, Match } from "@/lib/database.types";

export default async function LiveAdmin({ searchParams }: { searchParams: Promise<{ event?: string; match?: string; done?: string }> }) {
  const { event: eventParam, match: matchParam, done: doneParam } = await searchParams;
  const supabase = await createClient();
  // score keepers only have this page: no links to the event pages
  const { isAdmin: canManageEvents } = await getAdminUser();
  const [{ data: events }, { data: liveRows }, { data: courts }, { data: venues }, { data: freeformLive }, { data: players }] = await Promise.all([
    supabase.from("events").select("*").neq("status", "finished").order("event_date", { nullsFirst: false }).order("created_at", { ascending: false }),
    supabase.from("matches").select("event_id, is_live, status").neq("status", "finished").eq("is_bye", false).not("event_id", "is", null),
    supabase.from("courts").select("*").eq("active", true).order("name"),
    supabase.from("venues").select("*").eq("active", true).order("name"),
    supabase.from("matches").select("*").is("event_id", null).eq("is_live", true).order("updated_at", { ascending: false }),
    supabase.from("players").select("id, name, gender, level, region").eq("active", true).order("name"),
  ]);
  const all = (events ?? []) as CompEvent[];
  const running = all.filter((e) => e.status === "active");
  const onAir = new Set((liveRows ?? []).filter((r) => r.is_live).map((r) => r.event_id));
  const summaries: Record<string, EventLiveSummary> = {};
  for (const r of liveRows ?? []) {
    const s = (summaries[r.event_id!] ??= { onAir: 0, playing: 0, left: 0 });
    s.left++;
    if (r.is_live) s.onAir++;
    else if (r.status === "live") s.playing++;
  }
  const event = all.find((e) => e.id === eventParam) ?? running.find((e) => onAir.has(e.id)) ?? running[0] ?? null;

  const freeformSection = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-bold tracking-caps text-snow/70">LIVE TANPA EVENT</div>
        <StartFreeformButton courts={(courts ?? []) as Court[]} venues={venues ?? []} players={players ?? []} />
      </div>
      {freeformLive && freeformLive.length > 0 && <FreeformLiveList matches={freeformLive} courts={(courts ?? []) as Court[]} />}
    </>
  );

  if (!event) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Live" />
        {freeformSection}
        <NoRunningEvent drafts={all.filter((e) => e.status === "draft")} canManageEvents={canManageEvents} />
      </div>
    );
  }

  const data = await loadCompetition(supabase, { id: event.id });
  if (!data) return null;
  const current = pickCurrentMatch(data.matches, matchParam);
  const done = data.matches.find((m) => m.id === doneParam && m.status === "finished") ?? null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Live"
        actions={
          current && (
            <Link href={`/admin/live/quick?match=${current.id}`} className="flex items-center gap-1.5 text-sm text-snow/80 no-underline hover:text-volt">
              <PhoneIcon />
              Mode HP
            </Link>
          )
        }
      />
      {freeformSection}
      <LiveEventBar event={event} running={running} summaries={summaries} courts={data.courts.filter((c) => event.court_ids.includes(c.id))} />
      {done && <FinishedNotice done={done} next={current} all={data.matches} canManageEvents={canManageEvents} dismissHref={`/admin/live?event=${event.id}${current ? `&match=${current.id}` : ""}`} />}
      <div className="grid grid-cols-1 lg:grid-main-aside gap-6 items-start">
        {current ? (
          <LiveControl
            key={current.id}
            initial={current}
            label={[current.is_live ? "ON AIR" : current.status === "live" ? "Sedang dimainkan" : "Belum dimulai", matchName(current, data.matches), current.court_id ? courtNameOf(data.courts, current.court_id) : null].filter(Boolean).join(" · ")}
          />
        ) : (
          <EmptyState>Belum ada match yang siap. {data.matches.length ? "Tunggu babak sebelumnya selesai." : canManageEvents ? "Buat jadwal dulu di halaman event." : "Jadwal match belum dibuat admin."}</EmptyState>
        )}
        <MatchQueue data={data} currentId={current?.id ?? null} canManageEvents={canManageEvents} />
      </div>
    </div>
  );
}

/** Currently ON AIR matches with no event attached, each linking to its own control page. */
function FreeformLiveList({ matches, courts }: { matches: Match[]; courts: Court[] }) {
  return (
    <div className="flex flex-col gap-2">
      {matches.map((m) => {
        const court = courts.find((c) => c.id === m.court_id);
        return (
          <Link
            key={m.id}
            href={`/admin/live/freeform/${m.id}`}
            className="no-underline text-snow bg-ink-3 rounded-card py-3 px-4 flex items-center gap-3"
          >
            <span className="w-2 h-2 rounded-full bg-coral animate-livepulse flex-none" />
            <span className="flex-1 min-w-0 truncate font-semibold text-sm">
              {m.team_a_name} vs {m.team_b_name}
            </span>
            <span className="text-caption text-snow/65 flex-none">{court ? courtLabel(court.name) : "—"}</span>
          </Link>
        );
      })}
    </div>
  );
}
