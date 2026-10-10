import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadCompetition, type CompetitionData } from "@/lib/compData";
import { loadMabarRounds } from "@/lib/mabar";
import { formatSessionDay } from "@/lib/format";
import { EventHeader } from "@/components/admin/event/EventHeader";
import { EventRealtime } from "@/components/admin/event/EventRealtime";
import { KompetisiTabs, validCompTab } from "@/components/admin/event/kompetisi/KompetisiTabs";
import { MabarDetail } from "@/components/admin/event/mabar/MabarDetail";
import { KeuanganTab } from "@/components/admin/event/KeuanganTab";

/** Most recent score-log entries shown on the Match tab. */
const SCORE_LOG_LIMIT = 200;
import { EmptyState } from "@/components/ui/EmptyState";

export default async function EventDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; view?: string }> }) {
  const { id } = await params;
  const { tab, view } = await searchParams;
  const supabase = await createClient();

  const [data, { data: players }, { data: venues }, { data: courts }, { data: transactions }] = await Promise.all([
    loadCompetition(supabase, { id }),
    supabase.from("players").select("id, name, gender, level, region").eq("active", true).order("name"),
    supabase.from("venues").select("*").eq("active", true).order("name"),
    supabase.from("courts").select("*").eq("active", true).order("name"),
    supabase.from("event_transactions").select("*").eq("event_id", id).order("created_at"),
  ]);
  if (!data) notFound();

  const { event } = data;
  const { data: preset } = event.point_preset_id
    ? await supabase.from("point_presets").select("name").eq("id", event.point_preset_id).maybeSingle()
    : { data: null };
  const presetName = preset?.name ?? null;
  const { data: scoreLog } =
    event.type === "kompetisi"
      ? await supabase.from("comp_score_log").select("*").eq("event_id", event.id).order("created_at", { ascending: false }).limit(SCORE_LOG_LIMIT)
      : { data: [] };

  const venueCourtIds = data.courts.filter((c) => c.venue_id === event.venue_id).map((c) => c.id);
  const { data: hourRates } = venueCourtIds.length
    ? await supabase.from("court_hour_rates").select("*").in("court_id", venueCourtIds)
    : { data: [] };
  const eventCourts = data.courts.filter((c) => event.court_ids.includes(c.id));

  const participantCount = event.type === "kompetisi"
    ? data.teams.length
    : event.gen_event_id
      ? (await supabase.from("gen_participants").select("id", { count: "exact", head: true }).eq("event_id", event.gen_event_id).eq("active", true)).count ?? 0
      : 0;

  const showKeuangan = view === "keuangan";

  return (
    <div className="flex flex-col gap-5">
      {event.status !== "finished" && <EventRealtime eventId={event.id} />}
      <EventHeader
        event={event}
        dateLine={dateLine(data) || "Belum ada jadwal"}
        publicHref={event.published ? `/jadwal/${event.slug}` : null}
        venues={venues ?? []}
        courts={courts ?? []}
        back={data.league ? { href: `/admin/liga/${data.league.id}`, label: data.league.name } : undefined}
        leagueId={data.league?.id ?? null}
        hourRates={hourRates ?? []}
      />
      <EventSectionNav eventId={event.id} active={showKeuangan ? "keuangan" : "overview"} />
      {showKeuangan ? (
        <KeuanganTab
          event={event}
          courts={eventCourts}
          hourRates={hourRates ?? []}
          transactions={transactions ?? []}
          participantCount={participantCount}
        />
      ) : event.type === "mabar" ? (
        <MabarSection data={data} presetName={presetName} players={(players ?? []).map(({ id, name }) => ({ id, name }))} />
      ) : (
        <KompetisiTabs data={data} players={players ?? []} tab={validCompTab(tab)} presetName={presetName} scoreLog={scoreLog ?? []} />
      )}
    </div>
  );
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

/** "Jumat, 30 Okt · 18:00 WIB · East Padel House" */
function dateLine({ event, venue }: CompetitionData) {
  return [event.event_date ? formatSessionDay(event.event_date) : null, event.start_time ? `${event.start_time.slice(0, 5)} WIB` : null, venue?.name]
    .filter(Boolean)
    .join(" · ");
}

async function MabarSection({ data, presetName, players }: { data: CompetitionData; presetName: string | null; players: { id: string; name: string }[] }) {
  if (!data.event.gen_event_id) return <EmptyState>Data ronde mabar ini tidak ditemukan.</EmptyState>;
  const supabase = await createClient();
  const rounds = await loadMabarRounds(supabase, data.event.id, data.event.gen_event_id);
  return <MabarDetail data={{ event: data.event, ...rounds, courts: data.courts.map(({ id, name }) => ({ id, name })), players, presetName }} />;
}
