import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { courtLabel } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { LiveControl } from "@/components/admin/live/LiveControl";
import { EditFreeformForm } from "@/components/admin/live/EditFreeformForm";
import { CopyRow } from "@/components/admin/event/ObsLinks";

export default async function FreeformLivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: m } = await supabase.from("matches").select("*").eq("id", id).maybeSingle();
  if (!m || m.event_id) notFound(); // this page only controls event-less matches

  const [{ data: court }, { data: players }] = await Promise.all([
    m.court_id ? supabase.from("courts").select("name, venue_id").eq("id", m.court_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("players").select("id, name, gender, level, region").eq("active", true).order("name"),
  ]);
  const { data: venue } = court?.venue_id ? await supabase.from("venues").select("name").eq("id", court.venue_id).maybeSingle() : { data: null };

  const statusLabel = m.is_live ? "ON AIR" : m.status === "finished" ? "Selesai" : m.status === "live" ? "Sedang dimainkan" : "Belum dimulai";
  const label = [statusLabel, court ? courtLabel(court.name) : null, venue?.name].filter(Boolean).join(" · ");
  const overlayPath = m.court_id ? `/overlay?court=${m.court_id}` : `/overlay?match=${m.id}`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Live tanpa event" back={{ href: "/admin/live", label: "Live" }} />

      <div className="bg-ink-2 rounded-2xl p-5">
        <div className="font-bold mb-1">Link OBS</div>
        <p className="text-xs leading-normal text-snow/70 mt-0.5 mb-1.5">Link ini tetap sama sepanjang match ini berlangsung.</p>
        <CopyRow label="Overlay" path={overlayPath} />
      </div>

      <div className="grid grid-cols-1 lg:grid-main-aside gap-6 items-start">
        <LiveControl key={m.id} initial={m} label={label} />
        <EditFreeformForm m={m} players={players ?? []} />
      </div>
    </div>
  );
}
