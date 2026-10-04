import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChipTabs } from "@/components/ui/Tabs";
import { EventList, type EventRow } from "@/components/admin/event/EventList";
import { formatSessionDay } from "@/lib/format";
import { eventFormatLabel } from "@/lib/events";

type Filter = "semua" | "mabar" | "kompetisi";

export default async function EventsAdmin({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const supabase = await createClient();
  const [{ data: events }, { data: venues }] = await Promise.all([
    supabase.from("events").select("*").order("created_at", { ascending: false }),
    supabase.from("venues").select("id, name"),
  ]);

  const rows: EventRow[] = (events ?? []).map((e) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    format: eventFormatLabel(e),
    date: e.event_date ? formatSessionDay(e.event_date) : "—",
    venue: venues?.find((v) => v.id === e.venue_id)?.name ?? "—",
    status: e.status,
  }));
  const filter: Filter = type === "kompetisi" || type === "mabar" ? type : "semua";
  const count = (t: Filter) => (t === "semua" ? rows.length : rows.filter((r) => r.type === t).length);
  const tabs = (["semua", "mabar", "kompetisi"] as const).map((t) => ({
    value: t,
    label: `${t === "semua" ? "Semua" : t === "mabar" ? "Mabar" : "Kompetisi"} ${count(t)}`,
    href: t === "semua" ? "/admin/events" : `/admin/events?type=${t}`,
  }));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Event"
        description="Semua mabar dan kompetisi. Live match dan link OBS selalu nempel ke satu event."
        actions={<Link href="/admin/events/new" className="btn btn-coral tracking-button no-underline text-ink whitespace-nowrap">+ Buat Event</Link>}
      />
      <ChipTabs value={filter} options={tabs} />
      <EventList rows={filter === "semua" ? rows : rows.filter((r) => r.type === filter)} />
    </div>
  );
}
