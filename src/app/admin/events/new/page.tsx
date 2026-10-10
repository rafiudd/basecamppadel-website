import { createClient } from "@/lib/supabase/server";
import { NewEventWizard } from "@/components/admin/event/wizard/NewEventWizard";

export default async function NewEventPage() {
  const supabase = await createClient();
  const [{ data: players }, { data: venues }, { data: courts }, { data: presets }, { data: hourRates }] = await Promise.all([
    supabase.from("players").select("id, name, gender, level, region").eq("active", true).order("name"),
    supabase.from("venues").select("*").eq("active", true).order("name"),
    supabase.from("courts").select("*").eq("active", true).order("name"),
    supabase.from("point_presets").select("id, name").order("is_default", { ascending: false }).order("created_at"),
    supabase.from("court_hour_rates").select("*"),
  ]);

  return <NewEventWizard players={players ?? []} venues={venues ?? []} courts={courts ?? []} presets={presets ?? []} hourRates={hourRates ?? []} />;
}
