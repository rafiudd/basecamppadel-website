import { createClient } from "@/lib/supabase/server";
import { getEventIdBySlug, getLiveMatch } from "@/lib/queries";
import { OverlayScoreboard } from "@/components/OverlayScoreboard";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ match?: string; event?: string; court?: string; bg?: string }> };

/**
 * OBS browser source — set width 1920, height 1080.
 *   /overlay            follows whichever match is LIVE
 *   /overlay?match=ID   pins a specific match row
 *   /overlay?event=SLUG follows a match of that event that is ON AIR (the latest, if several)
 *   /overlay?event=SLUG&court=ID   follows the ON AIR match on that court (one camera per court)
 *   /overlay?bg=1       dark backdrop for previewing outside OBS
 */
export default async function OverlayPage({ searchParams }: Props) {
  const { match: matchId, event, court, bg } = await searchParams;
  const eventId = matchId ? undefined : await getEventIdBySlug(event);
  let initial = null;
  if (matchId) {
    const supabase = await createClient();
    const { data } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle();
    initial = data;
  } else {
    initial = await getLiveMatch(eventId, court);
  }
  return <OverlayScoreboard initial={initial} matchId={matchId} eventId={eventId} courtId={matchId ? undefined : court} showBackdrop={bg === "1"} />;
}
