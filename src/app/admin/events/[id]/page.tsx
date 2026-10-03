import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadCompetition, type CompetitionData } from "@/lib/compData";
import { loadMabarRounds } from "@/lib/mabar";
import { formatSessionDay } from "@/lib/format";
import { EventHeader } from "@/components/admin/event/EventHeader";
import { EventRealtime } from "@/components/admin/event/EventRealtime";
import { KompetisiTabs, validCompTab } from "@/components/admin/event/kompetisi/KompetisiTabs";
import { MabarDetail } from "@/components/admin/event/mabar/MabarDetail";

/** Most recent score-log entries shown on the Match tab. */
const SCORE_LOG_LIMIT = 200;
import { EmptyState } from "@/components/ui/EmptyState";

export default async function EventDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const supabase = await createClient();

  const [data, { data: players }, { data: venues }, { data: courts }] = await Promise.all([
    loadCompetition(supabase, { id }),
    supabase.from("players").select("id, name, gender, level, region").eq("active", true).order("name"),
    supabase.from("venues").select("*").eq("active", true).order("name"),
    supabase.from("courts").select("*").eq("active", true).order("name"),
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

  return (
    <div className="flex flex-col gap-5">
      {event.status !== "finished" && <EventRealtime eventId={event.id} />}
      <EventHeader
        event={event}
        dateLine={dateLine(data) || "Belum ada jadwal"}
        publicHref={event.published ? `/jadwal/${event.slug}` : null}
        venues={venues ?? []}
        courts={courts ?? []}
      />
      {event.type === "mabar" ? (
        <MabarSection data={data} presetName={presetName} players={(players ?? []).map(({ id, name }) => ({ id, name }))} />
      ) : (
        <KompetisiTabs data={data} players={players ?? []} tab={validCompTab(tab)} presetName={presetName} scoreLog={scoreLog ?? []} />
      )}
    </div>
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
