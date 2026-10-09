import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/auth";
import {
  getCoachingSessions,
  getSessionFullData,
  getCoachingSkills,
  getCoaches,
} from "@/lib/coaching-db";
import { CoachingClient } from "./CoachingClient";

export const metadata = { title: "Admin · Catatan Coaching — Basecamp Padel" };
export const dynamic = "force-dynamic";

export default async function CoachingAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { isAdmin, isCoach } = await getAdminUser();
  const { session: paramSessionId } = await searchParams;

  const supabase = await createClient();

  // Fetch all coaching sessions
  const sessions = await getCoachingSessions();
  const activeSessionId = paramSessionId || sessions[0]?.id || "";

  // Fetch session full data, all master skills, coaches, players, venues, events
  const [sessionData, allSkills, allCoaches, { data: allPlayers }, { data: venues }, { data: events }] =
    await Promise.all([
      activeSessionId ? getSessionFullData(activeSessionId) : null,
      getCoachingSkills(),
      getCoaches(),
      supabase.from("players").select("*").eq("active", true).order("name"),
      supabase.from("venues").select("*").eq("active", true).order("name"),
      supabase.from("events").select("id, title, event_date, venue_id").order("event_date", { ascending: false }),
    ]);

  return (
    <CoachingClient
      sessions={sessions}
      sessionData={sessionData}
      activeSessionId={activeSessionId}
      allSkills={allSkills}
      allCoaches={allCoaches}
      allPlayers={allPlayers ?? []}
      venues={venues ?? []}
      events={events ?? []}
      isAdmin={isAdmin}
    />
  );
}
