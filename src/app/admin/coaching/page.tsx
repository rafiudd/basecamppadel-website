import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/auth";
import {
  getCoachingSessions,
  getSessionFullData,
  getCoachingSkills,
  getCoaches,
} from "@/lib/coaching-db";
import { pickSessionTab, splitSessionsByStatus } from "@/lib/coaching";
import { CoachingClient } from "./CoachingClient";

export const metadata = { title: "Admin · Catatan Coaching — Basecamp Padel" };
export const dynamic = "force-dynamic";

export default async function CoachingAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; when?: string }>;
}) {
  const { isAdmin, isCoach } = await getAdminUser();
  const { session: paramSessionId, when } = await searchParams;

  const supabase = await createClient();

  // Coaching sessions split into one tab per status: Draft, Berjalan (active), Selesai (finished)
  const split = splitSessionsByStatus(await getCoachingSessions());
  const tab = pickSessionTab(split, when, paramSessionId);
  const sessions = split[tab];
  // No `?session=` means "show the session list", not "open the first one" — the list is the
  // page's default view now, not an auto-picked workspace.
  const activeSessionId = paramSessionId && sessions.some((s) => s.id === paramSessionId) ? paramSessionId : "";

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
      sessionTab={tab}
      sessionCounts={{ draft: split.draft.length, berjalan: split.berjalan.length, selesai: split.selesai.length }}
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
