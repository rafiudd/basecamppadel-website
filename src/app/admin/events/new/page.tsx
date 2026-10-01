import { createClient } from "@/lib/supabase/server";
import { NewEventWizard } from "@/components/admin/comp/NewEventWizard";

export default async function NewEventPage() {
  const supabase = await createClient();
  const [{ data: players }, { data: venues }, { data: courts }] = await Promise.all([
    supabase.from("players").select("id, name, gender, level").eq("active", true).order("name"),
    supabase.from("venues").select("*").eq("active", true).order("name"),
    supabase.from("courts").select("*").eq("active", true).order("name"),
  ]);

  return (
    <NewEventWizard
      players={players ?? []}
      venues={venues ?? []}
      courts={courts ?? []}
    />
  );
}
