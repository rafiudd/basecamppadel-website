import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/auth";
import {
  countCoachingSessionsByStatus,
  getCoachingSessionSummary,
  getCoachingSessionsPage,
  getSessionFullData,
  getCoachingSkills,
  getCoaches,
} from "@/lib/coaching-db";
import { pickSessionTab, parseSessionListQuery, statusTab, LEVEL_PIN, TAB_STATUS } from "@/lib/coaching";
import { getRecommendedClasses, type RecommendedClass } from "@/lib/server/kelas";
import { getPinMissions } from "@/lib/server/pinJourney";
import { CoachingClient } from "./CoachingClient";

export const metadata = { title: "Admin · Catatan Coaching — Basecamp Padel" };
export const dynamic = "force-dynamic";

export default async function CoachingAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; when?: string; q?: string; sort?: string; dir?: string; page?: string }>;
}) {
  const { isAdmin, role, coachId } = await getAdminUser();
  // A coach only sees sessions they're assigned to (has a group in); admin sees every session.
  const ownSessionsOnly = role === "coach" ? coachId : null;
  const params = await searchParams;
  const listQuery = parseSessionListQuery(params);

  const supabase = await createClient();

  // Coaching sessions sit in one tab per status: Draft, Berjalan (active), Selesai (finished).
  // Only the per-tab counts and (further down) one page of the open tab are loaded.
  const [sessionCounts, loadedSession] = await Promise.all([
    countCoachingSessionsByStatus(ownSessionsOnly),
    params.session ? getCoachingSessionSummary(params.session) : null,
  ]);
  // A coach opening a session they're not assigned to (e.g. a stale/guessed link) sees the list,
  // not that session's data.
  const activeSession = ownSessionsOnly && loadedSession && !loadedSession.coaches.some((c) => c.id === ownSessionsOnly) ? null : loadedSession;
  const tab = pickSessionTab(sessionCounts, params.when, activeSession ? statusTab(activeSession.status) : null);
  // No `?session=` means "show the session list", not "open the first one" — the list is the
  // page's default view now, not an auto-picked workspace.
  const activeSessionId = activeSession?.id ?? "";

  // Fetch session full data, all master skills, coaches, venues, events (players loaded on demand)
  const pins = [...new Set(Object.values(LEVEL_PIN))];
  const [sessionList, sessionData, allSkills, allCoaches, { data: venues }, { data: events }, recommendedByPin, missionsByLevel] =
    await Promise.all([
      activeSessionId ? null : getCoachingSessionsPage(TAB_STATUS[tab], listQuery, ownSessionsOnly),
      activeSessionId ? getSessionFullData(activeSessionId) : null,
      getCoachingSkills(),
      getCoaches(),
      supabase.from("venues").select("id, name").eq("active", true).order("name"),
      supabase.from("events").select("id, title, event_date, venue_id").order("event_date", { ascending: false }).limit(50),
      Promise.all(pins.map((pin) => getRecommendedClasses(supabase, pin))),
      getPinMissions(supabase),
    ]);
  const recommendedClassesByPin: Record<string, RecommendedClass[]> = Object.fromEntries(
    pins.map((pin, i) => [pin, recommendedByPin[i]]),
  );

  return (
    <CoachingClient
      sessionList={sessionList ? { ...sessionList, query: { ...listQuery, page: sessionList.page } } : null}
      activeSessionCoaches={activeSession?.coaches ?? []}
      sessionTab={tab}
      sessionCounts={sessionCounts}
      sessionData={sessionData}
      activeSessionId={activeSessionId}
      allSkills={allSkills}
      allCoaches={allCoaches}
      venues={venues ?? []}
      events={events ?? []}
      recommendedClassesByPin={recommendedClassesByPin}
      missionsByLevel={missionsByLevel}
      isAdmin={isAdmin}
    />
  );
}
