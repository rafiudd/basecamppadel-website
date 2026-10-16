import { createClient } from "@/lib/supabase/server";
import { NewEventWizard } from "@/components/admin/event/wizard/NewEventWizard";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams?: Promise<{
    league_id?: string;
    volume_id?: string;
    volume_num?: string;
    title?: string;
    preset_id?: string;
  }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const [{ data: players }, { data: venues }, { data: courts }, { data: presets }] = await Promise.all([
    supabase.from("players").select("id, name, gender, level, region").eq("active", true).order("name"),
    supabase.from("venues").select("*").eq("active", true).order("name"),
    supabase.from("courts").select("*").eq("active", true).order("name"),
    supabase.from("point_presets").select("id, name").order("is_default", { ascending: false }).order("created_at"),
  ]);

  return (
    <NewEventWizard
      players={players ?? []}
      venues={venues ?? []}
      courts={courts ?? []}
      presets={presets ?? []}
      initialLeague={{
        leagueId: sp.league_id,
        volumeId: sp.volume_id,
        volumeNum: sp.volume_num ? parseInt(sp.volume_num, 10) : undefined,
        title: sp.title,
        presetId: sp.preset_id,
      }}
    />
  );
}
