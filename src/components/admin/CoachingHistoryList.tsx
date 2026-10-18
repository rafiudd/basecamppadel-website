import { parseDateParts } from "@/lib/format";
import type { PlayerCoachingHistoryItem } from "@/app/admin/coaching/player-profile-actions";

/** Past coaching notes for one player (any status, admin/coach view) — shared by the profile popups
 *  on the coaching editor and the admin players list. */
export function CoachingHistoryList({ history }: { history: PlayerCoachingHistoryItem[] }) {
  if (history.length === 0) {
    return <div className="text-sm text-snow/50">Belum ada catatan coaching.</div>;
  }
  return (
    <div className="flex flex-col gap-3 max-h-[40vh] overflow-y-auto pr-1">
      {history.map((h) => (
        <div key={h.id} className="bg-ink rounded-xl p-4 flex flex-col gap-2 border border-snow/8">
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-snow/60">
            <span className="font-bold text-snow">{h.sessionTitle}</span>
            <span className="flex items-center gap-2">
              {h.sessionDate && parseDateParts(h.sessionDate).dateFormatted}
              {h.coachName && ` · Coach ${h.coachName}`}
              <span
                className={`rounded-full px-2 py-0.5 text-2xs font-bold ${
                  h.status === "submitted" ? "bg-win/20 text-win-soft" : "bg-volt/18 text-volt"
                }`}
              >
                {h.status === "submitted" ? "Terkirim" : "Draft"}
              </span>
            </span>
          </div>
          {h.evaluation && <p className="text-sm text-snow/85 whitespace-pre-line m-0">{h.evaluation}</p>}
          {h.nextPractice && (
            <div className="bg-volt/10 border border-volt/25 rounded-lg p-2.5">
              <span className="text-2xs uppercase tracking-wider font-bold text-snow/70">Latihan berikutnya</span>
              <p className="text-xs text-snow/80 whitespace-pre-line m-0 mt-1">{h.nextPractice}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
