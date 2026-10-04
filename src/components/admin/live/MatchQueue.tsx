import Link from "next/link";
import { MatchStatus } from "@/components/comp/MatchStatus";
import { courtNameOf, type CompetitionData } from "@/lib/compData";
import { awaitingTeams, matchSection, matchTeams } from "@/lib/compLabels";
import type { Match } from "@/lib/database.types";

/** Unfinished matches of the event (ON AIR first, then by start time); each opens in the score control. */
export function MatchQueue({ data, currentId }: { data: CompetitionData; currentId: string | null }) {
  const { event, matches, courts } = data;
  const queue = matches
    .filter((m) => !m.is_bye && m.status !== "finished")
    .sort((a, b) => Number(b.is_live) - Number(a.is_live) || (a.starts_at ?? "~").localeCompare(b.starts_at ?? "~"))
    .slice(0, 6);
  const label = (m: Match) => [matchSection(m), m.court_id ? courtNameOf(courts, m.court_id) : null].filter(Boolean).join(" · ");

  return (
    <div className="bg-ink-3 rounded-2xl px-5 py-4.5 flex flex-col">
      <div className="font-display font-bold text-title-sm mb-1">Antrian match</div>
      {queue.map((m) => {
        const names = matchTeams(m, matches);
        return (
          <Link
            key={m.id}
            href={`/admin/live?event=${event.id}&match=${m.id}`}
            aria-current={m.id === currentId ? "true" : undefined}
            className="flex items-center gap-3 py-3 border-t border-snow/8 no-underline text-snow hover:opacity-85"
          >
            <div className="flex-1 min-w-0 flex flex-col gap-0.75">
              <div className="text-2xs font-bold tracking-tag text-snow/70">{label(m)}</div>
              <div className="font-display font-bold text-sm leading-label">{names.a} vs {names.b}</div>
            </div>
            <MatchStatus m={m} />
          </Link>
        );
      })}
      {!queue.length && <div className="py-3 border-t border-snow/8 text-caption text-snow/60">Semua match sudah selesai.</div>}
      <Link href={`/admin/events/${event.id}${event.type === "mabar" ? "" : `?tab=${event.bracket_generated ? "playoff" : "match"}`}`} className="pt-3 border-t border-snow/8 text-sm font-bold text-volt no-underline">
        {event.type === "mabar" ? "Lihat semua ronde →" : event.bracket_generated ? "Lihat bracket →" : "Lihat semua match →"}
      </Link>
    </div>
  );
}

/**
 * The match to control: the requested one (unless it is already finished, so the control moves on by
 * itself after "Selesaikan match"), else ON AIR, else in play, else the next ready one.
 */
export function pickCurrentMatch(matches: Match[], requested?: string) {
  const playable = matches.filter((m) => !m.is_bye);
  const ready = (m: Match) => !awaitingTeams(m) && m.status !== "finished";
  return (
    playable.find((m) => m.id === requested && m.status !== "finished") ??
    playable.find((m) => m.is_live) ??
    playable.find((m) => m.status === "live") ??
    playable.filter(ready).sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? ""))[0] ??
    null
  );
}
