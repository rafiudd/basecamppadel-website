import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { getCoachingSkills, getCoaches } from "@/lib/coaching-db";
import { SessionFormClient } from "../SessionFormClient";

export const metadata = {
  title: "Admin · Edit Sesi Coaching — Basecamp Padel",
};
export const dynamic = "force-dynamic";

export default async function EditCoachingSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id: sessionId } = await params;
  const supabase = await createClient();

  const [
    { data: session },
    { data: groups },
    { data: sessionPlayers },
    skills,
    coaches,
    { data: allPlayers },
    { data: venues },
    { data: events },
  ] = await Promise.all([
    supabase.from("coaching_sessions").select("*").eq("id", sessionId).maybeSingle(),
    supabase.from("coaching_groups").select("*").eq("session_id", sessionId).order("created_at"),
    supabase.from("coaching_session_players").select("player_id, group_id").eq("session_id", sessionId),
    getCoachingSkills(true),
    getCoaches(),
    supabase.from("players").select("*").eq("active", true).order("name"),
    supabase.from("venues").select("*").eq("active", true).order("name"),
    supabase.from("events").select("id, title, event_date, venue_id").order("event_date", { ascending: false }),
  ]);

  if (!session) {
    notFound();
  }

  const initialSessionPlayerIds = (sessionPlayers || []).map((sp) => sp.player_id);
  const initialPlayerAssignments = (sessionPlayers || []).map((sp) => ({
    player_id: sp.player_id,
    group_id: sp.group_id,
  }));

  return (
    <SessionFormClient
      sessionId={session.id}
      initialTitle={session.title}
      initialDate={session.session_date}
      initialVenueName={session.venue_name}
      initialVenueId={session.venue_id || ""}
      initialEventId={session.event_id || ""}
      initialStatus={session.status as "draft" | "active" | "finished"}
      initialGroups={groups || []}
      initialSessionPlayerIds={initialSessionPlayerIds}
      initialPlayerAssignments={initialPlayerAssignments}
      initialSkillIds={session.default_skill_ids || []}
      venues={venues ?? []}
      events={events ?? []}
      coaches={coaches}
      skills={skills}
      allPlayers={allPlayers ?? []}
    />
  );
}
