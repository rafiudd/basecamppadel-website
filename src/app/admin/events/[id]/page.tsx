import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadCompetition, type CompetitionData } from "@/lib/compData";
import { loadMabarRounds } from "@/lib/mabar";
import { formatSessionDay } from "@/lib/format";
import { EventHeader } from "@/components/admin/event/EventHeader";
import { EventRealtime } from "@/components/admin/event/EventRealtime";
import { KompetisiTabs, validCompTab, type CompTab } from "@/components/admin/event/kompetisi/KompetisiTabs";
import { MabarDetail } from "@/components/admin/event/mabar/MabarDetail";
import { KeuanganTab } from "@/components/admin/event/KeuanganTab";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { CompEvent, Court, CourtHourRate } from "@/lib/database.types";

/** Most recent score-log entries shown on the Match tab. */
const SCORE_LOG_LIMIT = 200;

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; view?: string }>;
}) {
  const { id } = await params;
  const { tab, view } = await searchParams;
  const supabase = await createClient();

  // 1. Lightweight initial query: render Header & Section Nav instantly (< 100ms)
  const [{ data: event }, { data: venues }, { data: courts }] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).maybeSingle(),
    supabase.from("venues").select("*").eq("active", true).order("name"),
    supabase.from("courts").select("*").eq("active", true).order("name"),
  ]);
  if (!event) notFound();

  // League lookup if event is a volume of a league
  const { data: league } = event.league_id
    ? await supabase.from("leagues").select("id, name").eq("id", event.league_id).maybeSingle()
    : { data: null };

  const venueCourtIds = (courts ?? []).filter((c) => c.venue_id === event.venue_id).map((c) => c.id);
  const { data: hourRates } = venueCourtIds.length
    ? await supabase.from("court_hour_rates").select("*").in("court_id", venueCourtIds)
    : { data: [] };

  const venue = (venues ?? []).find((v) => v.id === event.venue_id);
  const dateLineStr = [
    event.event_date ? formatSessionDay(event.event_date) : null,
    event.start_time ? `${event.start_time.slice(0, 5)} WIB` : null,
    venue?.name,
  ]
    .filter(Boolean)
    .join(" · ");

  const showKeuangan = view === "keuangan";

  return (
    <div className="flex flex-col gap-5">
      {event.status !== "finished" && <EventRealtime eventId={event.id} />}
      <EventHeader
        event={event}
        dateLine={dateLineStr || "Belum ada jadwal"}
        publicHref={event.published ? `/jadwal/${event.slug}` : null}
        venues={venues ?? []}
        courts={courts ?? []}
        back={league ? { href: `/admin/liga/${league.id}`, label: league.name } : undefined}
        leagueId={league?.id ?? null}
        hourRates={hourRates ?? []}
      />
      <EventSectionNav eventId={event.id} active={showKeuangan ? "keuangan" : "overview"} />
      <Suspense key={`${view ?? "overview"}-${tab ?? "default"}`} fallback={<EventContentSkeleton />}>
        {showKeuangan ? (
          <AsyncKeuanganContent
            event={event}
            allCourts={courts ?? []}
            hourRates={hourRates ?? []}
          />
        ) : event.type === "mabar" ? (
          <AsyncMabarContent event={event} />
        ) : (
          <AsyncKompetisiContent event={event} tab={validCompTab(tab)} />
        )}
      </Suspense>
    </div>
  );
}

/** Streaming tab content: Keuangan */
async function AsyncKeuanganContent({
  event,
  allCourts,
  hourRates,
}: {
  event: CompEvent;
  allCourts: Court[];
  hourRates: CourtHourRate[];
}) {
  const supabase = await createClient();
  const eventCourts = allCourts.filter((c) => event.court_ids.includes(c.id));
  const [{ data: transactions }, participantCount] = await Promise.all([
    supabase.from("event_transactions").select("*").eq("event_id", event.id).order("created_at"),
    getParticipantCount(supabase, event),
  ]);

  return (
    <KeuanganTab
      event={event}
      courts={eventCourts}
      hourRates={hourRates}
      transactions={transactions ?? []}
      participantCount={participantCount}
    />
  );
}

/** Streaming tab content: Mabar */
async function AsyncMabarContent({ event }: { event: CompEvent }) {
  if (!event.gen_event_id) return <EmptyState>Data ronde mabar ini tidak ditemukan.</EmptyState>;
  const supabase = await createClient();
  const [data, { data: players }, { data: preset }] = await Promise.all([
    loadCompetition(supabase, { id: event.id }),
    supabase.from("players").select("id, name").eq("active", true).order("name"),
    event.point_preset_id
      ? supabase.from("point_presets").select("name").eq("id", event.point_preset_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!data) notFound();

  return (
    <MabarSection
      data={data}
      presetName={preset?.name ?? null}
      players={(players ?? []).map(({ id, name }) => ({ id, name }))}
    />
  );
}

/** Streaming tab content: Kompetisi */
async function AsyncKompetisiContent({
  event,
  tab,
}: {
  event: CompEvent;
  tab: CompTab;
}) {
  const supabase = await createClient();
  const shouldLoadScoreLog = tab === "match";

  const [data, { data: players }, { data: preset }, { data: scoreLog }] = await Promise.all([
    loadCompetition(supabase, { id: event.id }),
    supabase.from("players").select("id, name, gender, level, region").eq("active", true).order("name"),
    event.point_preset_id
      ? supabase.from("point_presets").select("name").eq("id", event.point_preset_id).maybeSingle()
      : Promise.resolve({ data: null }),
    shouldLoadScoreLog
      ? supabase
          .from("comp_score_log")
          .select("*")
          .eq("event_id", event.id)
          .order("created_at", { ascending: false })
          .limit(SCORE_LOG_LIMIT)
      : Promise.resolve({ data: [] }),
  ]);

  if (!data) notFound();

  return (
    <KompetisiTabs
      data={data}
      players={players ?? []}
      tab={tab}
      presetName={preset?.name ?? null}
      scoreLog={scoreLog ?? []}
    />
  );
}

async function getParticipantCount(supabase: any, event: CompEvent): Promise<number> {
  if (event.type === "kompetisi") {
    const { count } = await supabase
      .from("comp_teams")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id);
    return count ?? 0;
  }
  if (event.gen_event_id) {
    const { count } = await supabase
      .from("gen_participants")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.gen_event_id)
      .eq("active", true);
    return count ?? 0;
  }
  return 0;
}

/** "Overview" (the event's own type-specific content) vs "Keuangan" (budget, same shape for both types). */
function EventSectionNav({ eventId, active }: { eventId: string; active: "overview" | "keuangan" }) {
  const base = "no-underline flex-1 basis-0 sm:flex-none sm:basis-auto rounded-tile min-h-11 px-5 py-2 text-sm font-bold flex items-center justify-center";
  return (
    <nav className="flex gap-1.5 p-1 rounded-card bg-ink-3 w-fit" aria-label="Bagian event">
      <Link href={`/admin/events/${eventId}`} className={`${base} ${active === "overview" ? "bg-volt text-indigo" : "text-snow/85"}`}>
        Overview
      </Link>
      <Link href={`/admin/events/${eventId}?view=keuangan`} className={`${base} ${active === "keuangan" ? "bg-volt text-indigo" : "text-snow/85"}`}>
        Keuangan
      </Link>
    </nav>
  );
}

async function MabarSection({ data, presetName, players }: { data: CompetitionData; presetName: string | null; players: { id: string; name: string }[] }) {
  if (!data.event.gen_event_id) return <EmptyState>Data ronde mabar ini tidak ditemukan.</EmptyState>;
  const supabase = await createClient();
  const rounds = await loadMabarRounds(supabase, data.event.id, data.event.gen_event_id);
  return <MabarDetail data={{ event: data.event, ...rounds, courts: data.courts.map(({ id, name }) => ({ id, name })), players, presetName }} />;
}

function EventContentSkeleton() {
  return (
    <div className="flex flex-col gap-5 animate-pulse">
      <div className="flex gap-2">
        <Skeleton tone="dark" className="h-10 w-28 rounded-lg" />
        <Skeleton tone="dark" className="h-10 w-28 rounded-lg" />
        <Skeleton tone="dark" className="h-10 w-28 rounded-lg" />
        <Skeleton tone="dark" className="h-10 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton tone="dark" className="h-64 w-full rounded-2xl" />
        <Skeleton tone="dark" className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}

