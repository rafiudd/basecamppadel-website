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
  const [{ data: metaEvents }, { data: venues }, { data: leagues }] = await Promise.all([
    supabase.from("events").select("id, type, league_id").order("created_at", { ascending: false }),
    supabase.from("venues").select("id, name"),
    supabase.from("leagues").select("id, name").order("created_at", { ascending: false }),
  ]);
  const leagueIds = new Set((leagues ?? []).map((l) => l.id));

  const filter: Filter = type === "kompetisi" || type === "mabar" || type === "liga" ? type : "semua";
  const leagueFilter = filter === "liga" && league && leagueIds.has(league) ? league : "";

  const validLeagueId = (lid?: string | null) => (lid && leagueIds.has(lid) ? lid : null);
  const matchesMeta = (e: { type: string; league_id?: string | null }, t: Filter) =>
    t === "semua" || (t === "liga" ? !!validLeagueId(e.league_id) : e.type === t);

  const shownMeta = (metaEvents ?? []).filter(
    (e) => matchesMeta(e, filter) && (!leagueFilter || validLeagueId(e.league_id) === leagueFilter),
  );

  const leagueOptions = (leagues ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    count: (metaEvents ?? []).filter((e) => validLeagueId(e.league_id) === l.id).length,
  }));

  const tabs = (["semua", "mabar", "kompetisi", "liga"] as const).map((t) => ({
    value: t,
    label: `${FILTER_LABEL[t]} ${(metaEvents ?? []).filter((e) => matchesMeta(e, t)).length}`,
    href: t === "semua" ? "/admin/events" : `/admin/events?type=${t}`,
  }));

  const totalPages = Math.max(1, Math.ceil(shownMeta.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(pageParam) || 1), totalPages);
  const offset = (page - 1) * PAGE_SIZE;

  let pageQuery = supabase
    .from("events")
    .select("id, type, title, event_date, start_time, venue_id, status, league_id, match_format, game_format, target_points, points_type")
    .order("created_at", { ascending: false });

  if (filter === "kompetisi" || filter === "mabar") {
    pageQuery = pageQuery.eq("type", filter);
  } else if (filter === "liga") {
    if (leagueFilter) {
      pageQuery = pageQuery.eq("league_id", leagueFilter);
    } else {
      pageQuery = pageQuery.in("league_id", Array.from(leagueIds));
    }
  }

  const { data: pageEvents } = await pageQuery.range(offset, offset + PAGE_SIZE - 1);

  const pageRows: EventRow[] = (pageEvents ?? []).map((e) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    format: eventFormatLabel(e),
    date: e.event_date ? formatSessionDay(e.event_date) : "—",
    venue: venues?.find((v) => v.id === e.venue_id)?.name ?? "—",
    status: e.status,
    leagueId: e.league_id && leagueIds.has(e.league_id) ? e.league_id : null,
  }));
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
