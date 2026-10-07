import Link from "next/link";
import { MatchStatus } from "@/components/comp/MatchStatus";
import { courtNameOf, isoToWibTime, type CompetitionData } from "@/lib/compData";
import { awaitingTeams, matchSection, matchTeams } from "@/lib/compLabels";
import type { Match } from "@/lib/database.types";

/** How many "Berikutnya" rows to show at most (playing matches are always all shown). */
const NEXT_ROWS = 5;

/** ON AIR, then being played, then ready, then waiting for teams; same rank by start time. */
const rank = (m: Match) => (m.is_live ? 0 : m.status === "live" ? 1 : awaitingTeams(m) ? 3 : 2);

/**
 * Unfinished matches of the event in two groups, "Sedang berjalan" and "Berikutnya"; each opens in
 * the score control, and the one being controlled is highlighted.
 */
export function MatchQueue({ data, currentId }: { data: CompetitionData; currentId: string | null }) {
  const { event, matches, courts } = data;
  const all = matches
    .filter((m) => !m.is_bye && m.status !== "finished")
    .sort((a, b) => rank(a) - rank(b) || (a.starts_at ?? "~").localeCompare(b.starts_at ?? "~"));
  const playing = all.filter((m) => rank(m) <= 1);
  const next = all.filter((m) => rank(m) >= 2);
  const shownNext = next.slice(0, NEXT_ROWS);
  const hidden = next.length - shownNext.length;
  const detail = (m: Match) =>
    [matchSection(m), m.court_id ? courtNameOf(courts, m.court_id) : null, m.status === "scheduled" ? isoToWibTime(m.starts_at) : null].filter(Boolean).join(" · ");

  const row = (m: Match) => {
    const names = matchTeams(m, matches);
    const current = m.id === currentId;
    return (
      <Link
        key={m.id}
        href={`/admin/live?event=${event.id}&match=${m.id}`}
        aria-current={current ? "true" : undefined}
        className={`flex items-center gap-3 -mx-2.5 px-2.5 py-2.5 rounded-lg no-underline text-snow ${current ? "bg-snow/8 shadow-mark-volt" : "hover:bg-snow/5"}`}
      >
        <div className="flex-1 min-w-0 flex flex-col gap-0.75">
          <div className="text-2xs font-bold tracking-tag text-snow/70">
            {detail(m)}
            {current && <span className="text-volt"> · DIKONTROL</span>}
          </div>
          <div className="font-display font-bold text-sm leading-label">{names.a} vs {names.b}</div>
        </div>
        <MatchStatus m={m} />
      </Link>
    );
  };

  const heading = (text: string, count: number) => (
    <div className="flex items-center justify-between pt-3 pb-1 border-t border-snow/8 text-2xs font-bold tracking-caps text-snow/60">
      <span>{text}</span>
      <span>{count}</span>
    </div>
  );

  return (
    <div className="bg-ink-3 rounded-2xl px-5 py-4.5 flex flex-col">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div className="font-display font-bold text-title-sm">Antrian match</div>
        {all.length > 0 && <div className="text-caption text-snow/60">{all.length} tersisa</div>}
      </div>
      {playing.length > 0 && (
        <>
          {heading("SEDANG BERJALAN", playing.length)}
          <div className="flex flex-col pb-2">{playing.map(row)}</div>
        </>
      )}
      {next.length > 0 && (
        <>
          {heading("BERIKUTNYA", next.length)}
          <div className="flex flex-col pb-2">{shownNext.map(row)}</div>
        </>
      )}
      {!all.length && <div className="py-3 border-t border-snow/8 text-caption text-snow/60">Semua match sudah selesai.</div>}
      <Link href={`/admin/events/${event.id}${event.type === "mabar" ? "" : `?tab=${event.bracket_generated ? "playoff" : "match"}`}`} className="pt-3 border-t border-snow/8 text-sm font-bold text-volt no-underline">
        {hidden > 0 && <span className="font-semibold text-snow/70">+{hidden} match lagi · </span>}
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
