import { createClient } from "@/lib/supabase/server";
import { getLiveMatch } from "@/lib/queries";
import { OverlayScoreboard } from "@/components/OverlayScoreboard";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ match?: string; bg?: string }> };

/**
 * OBS browser source — set width 1920, height 1080.
 *   /overlay            follows whichever match is LIVE
 *   /overlay?match=ID   pins a specific match row
 *   /overlay?bg=1       dark backdrop for previewing outside OBS
 */
export default async function OverlayPage({ searchParams }: Props) {
  const { match: matchId, bg } = await searchParams;
  let initial = null;
  if (matchId) {
    const supabase = await createClient();
    const { data } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle();
    initial = data;
  } else {
    initial = await getLiveMatch();
  }
  return <OverlayScoreboard initial={initial} matchId={matchId} showBackdrop={bg === "1"} />;
}
