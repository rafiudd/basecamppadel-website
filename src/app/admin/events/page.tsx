import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChipTabs } from "@/components/ui/Tabs";
import { EventList, type EventRow } from "@/components/admin/event/EventList";
import { LeagueFilter } from "@/components/admin/event/LeagueFilter";
import { LinkPagination } from "@/components/ui/Pagination";
import { formatSessionDay } from "@/lib/format";
import { eventFormatLabel } from "@/lib/events";

type Filter = "semua" | "mabar" | "kompetisi" | "liga";

const FILTER_LABEL: Record<Filter, string> = { semua: "Semua", mabar: "Mabar", kompetisi: "Kompetisi", liga: "Liga" };
const PAGE_SIZE = 25;

export default async function EventsAdmin({ searchParams }: { searchParams: Promise<{ type?: string; league?: string; page?: string }> }) {
  const { type, league, page: pageParam } = await searchParams;
  const supabase = await createClient();
  const [{ data: events }, { data: venues }, { data: leagues }] = await Promise.all([
    supabase.from("events").select("*").order("created_at", { ascending: false }),
    supabase.from("venues").select("id, name"),
    supabase.from("leagues").select("id, name").order("created_at", { ascending: false }),
  ]);
  const leagueIds = new Set((leagues ?? []).map((l) => l.id));

  const rows: EventRow[] = (events ?? []).map((e) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    format: eventFormatLabel(e),
    date: e.event_date ? formatSessionDay(e.event_date) : "—",
    venue: venues?.find((v) => v.id === e.venue_id)?.name ?? "—",
    status: e.status,
    // only a league that still exists: events of a deleted league keep no badge
    leagueId: e.league_id && leagueIds.has(e.league_id) ? e.league_id : null,
  }));
  const filter: Filter = type === "kompetisi" || type === "mabar" || type === "liga" ? type : "semua";
  const matches = (r: EventRow, t: Filter) => t === "semua" || (t === "liga" ? !!r.leagueId : r.type === t);
  // under the Liga tab, `?league=` narrows to one league; an unknown id falls back to all leagues
  const leagueFilter = filter === "liga" && league && leagueIds.has(league) ? league : "";
  const shown = rows.filter((r) => matches(r, filter) && (!leagueFilter || r.leagueId === leagueFilter));
  const leagueOptions = (leagues ?? []).map((l) => ({ id: l.id, name: l.name, count: rows.filter((r) => r.leagueId === l.id).length }));
  const tabs = (["semua", "mabar", "kompetisi", "liga"] as const).map((t) => ({
    value: t,
    label: `${FILTER_LABEL[t]} ${rows.filter((r) => matches(r, t)).length}`,
    href: t === "semua" ? "/admin/events" : `/admin/events?type=${t}`,
  }));

  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(pageParam) || 1), totalPages);
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (league) params.set("league", league);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/events?${qs}` : "/admin/events";
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Event"
        description="Semua mabar dan kompetisi. Live match dan link OBS selalu nempel ke satu event."
        actions={<Link href="/admin/events/new" className="btn btn-coral tracking-button no-underline text-ink whitespace-nowrap">+ Buat Event</Link>}
      />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <ChipTabs value={filter} options={tabs} />
        {filter === "liga" && <LeagueFilter leagues={leagueOptions} value={leagueFilter} />}
      </div>
      <EventList rows={pageRows} />
      <LinkPagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
    </div>
  );
}
