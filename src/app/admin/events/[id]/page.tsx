import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadCompetition } from "@/lib/compData";
import { EventHeader } from "@/components/admin/comp/EventHeader";
import { EventDetailTabs } from "@/components/admin/comp/EventDetailTabs";
import { formatSessionDay } from "@/lib/format";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const supabase = await createClient();

  const [data, { data: players }] = await Promise.all([
    loadCompetition(supabase, { id }),
    supabase.from("players").select("id, name, gender, level").eq("active", true).order("name"),
  ]);

  if (!data) notFound();

  const { event } = data;
  const dateLine = [
    event.event_date ? formatSessionDay(event.event_date) : null,
    event.start_time ? `${event.start_time.slice(0, 5)} WIB` : null,
    data.venue?.name,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-6">
      <EventHeader
        title={event.title}
        slug={event.slug}
        dateLine={dateLine || "Belum ada jadwal"}
        liveHref="/admin/live"
        editHref={`/admin/events/${event.id}?tab=format`}
        publicHref={event.published ? `/jadwal/${event.slug}` : null}
        eventType={event.type}
      />

      <EventDetailTabs
        data={data}
        availablePlayers={players ?? []}
        initialTab={tab}
      />
    </div>
  );
}
