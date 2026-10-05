import { YOUTUBE_URL } from "@/lib/config";
import type { EventItem } from "@/lib/events";

export function LiveBanner({ event }: { event: EventItem }) {
  if (event.status !== "live" || !event.liveScore) return null;

  const { liveScore } = event;
  const isTeam1Serving = liveScore.servingTeam === 1;

  return (
    <section className="bg-indigo rounded-2xl p-5 md:p-[22px_26px] text-snow flex flex-col md:flex-row md:items-center justify-between gap-7 shadow-sm">
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-bold tracking-[0.08em] text-coral uppercase">
          <span className="w-2 h-2 rounded-full bg-coral animate-livepulse" />
          {liveScore.title}
        </div>

        {/* Team 1 */}
        <div
          className={`flex items-center gap-3 pl-2.5 border-l-[3px] ${
            isTeam1Serving ? "border-volt" : "border-transparent"
          }`}
        >
          <div
            className={`w-3 h-3 rounded-full flex-none ${
              isTeam1Serving
                ? "bg-volt shadow-[0_0_0_3px_rgba(255,212,59,0.25)]"
                : "bg-transparent"
            }`}
          />
          <div className="font-display font-bold text-lg uppercase flex-1 min-w-0 truncate text-snow">
            {liveScore.team1.name}
          </div>
          <div className="flex gap-1.5">
            {liveScore.team1.sets.map((s, idx) => (
              <div
                key={idx}
                className="w-8 h-8 rounded-md bg-snow/10 flex items-center justify-center font-display font-bold text-[15px] text-snow"
              >
                {s}
              </div>
            ))}
          </div>
          <div
            className={`w-11 h-11 rounded-lg flex items-center justify-center font-display font-bold text-xl ${
              isTeam1Serving ? "bg-volt text-indigo" : "bg-snow/10 text-snow"
            }`}
          >
            {liveScore.team1.game}
          </div>
        </div>

        {/* Team 2 */}
        <div
          className={`flex items-center gap-3 pl-2.5 border-l-[3px] ${
            !isTeam1Serving ? "border-volt" : "border-transparent"
          }`}
        >
          <div
            className={`w-3 h-3 rounded-full flex-none ${
              !isTeam1Serving
                ? "bg-volt shadow-[0_0_0_3px_rgba(255,212,59,0.25)]"
                : "bg-transparent"
            }`}
          />
          <div className="font-display font-bold text-lg uppercase flex-1 min-w-0 truncate text-snow">
            {liveScore.team2.name}
          </div>
          <div className="flex gap-1.5">
            {liveScore.team2.sets.map((s, idx) => (
              <div
                key={idx}
                className="w-8 h-8 rounded-md bg-snow/10 flex items-center justify-center font-display font-bold text-[15px] text-snow"
              >
                {s}
              </div>
            ))}
          </div>
          <div
            className={`w-11 h-11 rounded-lg flex items-center justify-center font-display font-bold text-xl ${
              !isTeam1Serving ? "bg-volt text-indigo" : "bg-snow/10 text-snow"
            }`}
          >
            {liveScore.team2.game}
          </div>
        </div>
      </div>

      <a
        href={liveScore.streamUrl || YOUTUBE_URL}
        target="_blank"
        rel="noopener"
        className="flex-none no-underline bg-coral text-ink font-bold text-sm py-3.5 px-6 rounded-full text-center transition-transform hover:scale-105 active:scale-95"
      >
        Tonton live
      </a>
    </section>
  );
}
