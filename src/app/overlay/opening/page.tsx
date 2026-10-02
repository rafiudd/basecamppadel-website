import { createClient } from "@/lib/supabase/server";
import { getLiveMatch } from "@/lib/queries";
import { formatStartLine } from "@/lib/format";
import { CountdownBadge } from "@/components/CountdownBadge";
import { MountainMark } from "@/components/Logo";
import { SponsorStrip } from "@/components/SponsorStrip";
import { MEDIA_PARTNER_LOGOS } from "@/lib/config";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ match?: string; time?: string }> };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * Opening / starting-soon title card (OBS scene 1), 1920x1080.
 *   /overlay/opening?match=ID&time=16:00
 */
export default async function OpeningPage({ searchParams }: Props) {
  const { match: matchId, time } = await searchParams;
  const supabase = await createClient();

  const match = matchId
    ? (await supabase.from("matches").select("*").eq("id", matchId).maybeSingle()).data
    : await getLiveMatch();

  const session = match?.session_id
    ? (await supabase.from("sessions").select("*").eq("id", match.session_id).maybeSingle()).data
    : null;

  let dateLine = "";
  if (match?.starts_at) {
    dateLine = formatStartLine(match.starts_at, match.ends_at);
  } else if (session) {
    const [y, m, d] = session.session_date.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dateLine = `${DAYS[dt.getUTCDay()]}, ${d} ${MONTHS[m - 1]} · ${session.time_range}`;
  }
  const fallbackTime = time ?? session?.time_range?.split(/[–-]/)[0]?.replace(".", ":") ?? "";

  return (
    <div className="relative w-[1920px] h-[1080px] overflow-hidden bg-ink font-sans text-snow">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#2a2460,#17151F)]" />
      <div className="absolute inset-0 bg-ink/68" />

      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1280px] px-[72px] py-16 rounded-[20px] border border-snow/25 flex flex-col items-center gap-7"
        style={{ background: "rgba(17,15,26,0.88)", backdropFilter: "blur(14px)", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}
      >
        {match?.starts_at ? (
          <CountdownBadge startsAt={match.starts_at} />
        ) : (
          <div className="flex items-center gap-2.5 bg-coral/15 border border-coral/50 rounded-full px-5 py-2">
            <div className="w-2.5 h-2.5 rounded-full bg-coral animate-livepulse" />
            <div className="font-sans font-bold text-base tracking-[0.1em] text-coral uppercase">
              Starting Soon{fallbackTime ? ` · ${fallbackTime}` : ""}
            </div>
          </div>
        )}

        <MountainMark size={64} />

        <div className="flex items-center gap-6 w-full">
          <div className="flex-1 h-px bg-snow/30" />
          <div className="font-display font-bold text-[26px] tracking-[0.18em] text-snow">BASECAMP PADEL</div>
          <div className="flex-1 h-px bg-snow/30" />
        </div>

        <div className="w-full bg-coral rounded-xl py-[22px] text-center">
          <div className="font-display font-bold text-[76px] text-snow tracking-[0.02em] uppercase leading-none">
            {match?.session_label || session?.title || "BASECAMP BATTLE"}
          </div>
        </div>

        {match && (
          <div className="flex items-center gap-6 w-full justify-center">
            <div className="font-display font-bold text-[32px] text-snow uppercase text-right flex-1 min-w-0 truncate">
              {match.team_a_name}
            </div>
            <div className="font-display font-bold text-[18px] text-ink bg-volt rounded-full w-14 h-14 flex items-center justify-center flex-none">
              VS
            </div>
            <div className="font-display font-bold text-[32px] text-snow uppercase text-left flex-1 min-w-0 truncate">
              {match.team_b_name}
            </div>
          </div>
        )}

        <div className="font-display font-bold text-[34px] text-snow uppercase">{match?.venue || session?.venue || ""}</div>
        {dateLine && (
          <div className="font-sans font-semibold text-[20px] tracking-[0.04em] text-volt uppercase">{dateLine}</div>
        )}

        <div className="w-full pt-5 mt-1 border-t border-snow/15 flex flex-col items-center gap-3">
          <SponsorStrip height={76} shape="circle" />
          <SponsorStrip logos={MEDIA_PARTNER_LOGOS} height={26} label="Media Partner" />
        </div>
      </div>
    </div>
  );
}
