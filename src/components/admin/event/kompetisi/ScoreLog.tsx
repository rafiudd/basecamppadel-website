import { matchName } from "@/lib/compLabels";
import type { CompScoreLog, Match } from "@/lib/database.types";

type Snapshot = { games_a?: number; games_b?: number; is_wo?: boolean };

const fmtScore = (s: Snapshot | null) => (!s ? "—" : s.is_wo ? "WO" : `${s.games_a ?? 0}–${s.games_b ?? 0}`);
const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** Every result entry and correction (newest first), from comp_score_log. */
export function ScoreLog({ log, matches }: { log: CompScoreLog[]; matches: Match[] }) {
  if (!log.length) return null;
  const byId = new Map(matches.map((m) => [m.id, m]));
  return (
    <details className="bg-ink-3 rounded-card px-4.5 py-3.5">
      <summary className="cursor-pointer font-bold text-sm">
        Log skor <span className="font-medium text-snow/65">· {log.filter((l) => l.action === "correct").length} koreksi</span>
      </summary>
      <div className="mt-2 flex flex-col">
        {log.map((l) => {
          const m = l.match_id ? byId.get(l.match_id) : undefined;
          return (
            <div key={l.id} className="flex items-center gap-3 py-2 border-t border-snow/8 text-caption flex-wrap">
              <span className="text-snow/60 w-27.5 flex-none">{fmtTime(l.created_at)}</span>
              <span className="font-semibold flex-1 min-w-40">{m ? `${matchName(m, matches)} · ${m.team_a_name} vs ${m.team_b_name}` : "Match dihapus"}</span>
              <span className={l.action === "correct" ? "text-coral-soft font-semibold" : "text-snow/75"}>
                {l.action === "correct" ? `Koreksi ${fmtScore(l.before as Snapshot)} → ${fmtScore(l.after as Snapshot)}` : `Selesai ${fmtScore(l.after as Snapshot)}`}
              </span>
            </div>
          );
        })}
      </div>
    </details>
  );
}
