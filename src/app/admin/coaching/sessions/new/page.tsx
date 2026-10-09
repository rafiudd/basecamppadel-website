import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { getCoachingSkills, getCoaches } from "@/lib/coaching-db";
import { SessionFormClient } from "../SessionFormClient";

export const metadata = {
  title: "Admin · Buat Sesi Coaching Baru — Basecamp Padel",
};
export const dynamic = "force-dynamic";

export default async function NewCoachingSessionPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [skills, coaches, { data: allPlayers }, { data: venues }, { data: events }] =
    await Promise.all([
      getCoachingSkills(true),
      getCoaches(),
      supabase.from("players").select("*").eq("active", true).order("name"),
      supabase.from("venues").select("*").eq("active", true).order("name"),
      supabase.from("events").select("id, title, event_date, venue_id").order("event_date", { ascending: false }),
    ]);

  return (
    <SessionFormClient
      venues={venues ?? []}
      events={events ?? []}
      coaches={coaches}
      skills={skills}
      allPlayers={allPlayers ?? []}
    />
  );
}
