import { createClient } from "@/lib/supabase/server";
import { getEventIdBySlug, getLiveMatch } from "@/lib/queries";
import { OverlayScoreboard } from "@/components/OverlayScoreboard";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ match?: string; event?: string; court?: string; bg?: string }> };

/**
 * OBS browser source — set width 1920, height 1080. One link for the whole event: it shows the
 * "Starting Soon" card on its own whenever nothing is ON AIR, and switches itself to the live
 * scoreboard the moment a match goes live — no separate opening-card scene/link to swap in OBS.
 *   /overlay            follows whichever match is LIVE, else the next scheduled one
 *   /overlay?match=ID   pins a specific match row
 *   /overlay?event=SLUG follows a match of that event that is ON AIR (the latest, if several)
 *   /overlay?event=SLUG&court=ID   follows the ON AIR match on that court (one camera per court)
 *   /overlay?bg=1       dark backdrop for previewing outside OBS
 */
export default async function OverlayPage({ searchParams }: Props) {
  const { match: matchId, event, court, bg } = await searchParams;
  const eventId = matchId ? undefined : await getEventIdBySlug(event);
  const supabase = await createClient();
  let initial = null;
  if (matchId) {
    const { data } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle();
    initial = data;
  } else {
    initial = await getLiveMatch(eventId, court);
    // Nothing ON AIR: fall back to the next scheduled match so the "Starting Soon" card still
    // shows who's playing next, instead of a bare placeholder.
    if (!initial && eventId) {
      const { data } = await supabase
        .from("matches")
        .select("*")
        .eq("event_id", eventId)
        .match(court ? { court_id: court } : {})
        .eq("status", "scheduled")
        .order("starts_at", { nullsFirst: false })
        .limit(1)
        .maybeSingle();
      initial = data;
    }
  }
  return <OverlayScoreboard initial={initial} matchId={matchId} eventId={eventId} courtId={matchId ? undefined : court} showBackdrop={bg === "1"} />;
}
