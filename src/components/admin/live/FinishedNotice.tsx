import Link from "next/link";
import { matchName } from "@/lib/compLabels";
import type { Match } from "@/lib/database.types";

/**
 * Shown after "Selesaikan match": the result that was just saved, and which match the control moved
 * on to (or that there is none left).
 */
export function FinishedNotice({ done, next, all, dismissHref }: { done: Match; next: Match | null; all: Match[]; dismissHref: string }) {
  const result = done.is_wo
    ? `${done.winner === "A" ? done.team_a_name : done.team_b_name} menang WO`
    : `${done.team_a_name} ${done.team_a_games}–${done.team_b_games} ${done.team_b_name}`;
  return (
    <div role="status" className="bg-win/15 rounded-card px-4 py-3 flex items-start justify-between gap-3">
      <div className="text-sm leading-relaxed">
        <div className="font-bold text-win-soft">{matchName(done, all)} selesai · tersimpan</div>
        <div className="text-snow/85">{result}</div>
        <div className="text-snow/70 text-caption mt-0.5">
          {next ? (
            <>Sekarang: <b className="text-snow">{matchName(next, all)}</b> · {next.team_a_name} vs {next.team_b_name}</>
          ) : (
            <>
              Tidak ada match lain yang siap.{" "}
              <Link href={`/admin/events/${done.event_id}`} className="text-volt no-underline">Buka halaman event →</Link>
            </>
          )}
        </div>
      </div>
      <Link href={dismissHref} aria-label="Tutup" className="text-snow/60 no-underline text-lg leading-none px-1 hover:text-snow">×</Link>
    </div>
  );
}
