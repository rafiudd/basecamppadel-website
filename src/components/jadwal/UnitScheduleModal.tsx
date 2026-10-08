"use client";

import type { UnitMatchRow } from "@/lib/mabar";

const RESULT_STYLE: Record<string, string> = { W: "text-[#23794A]", L: "text-ink/45", D: "text-ink/65" };

/** Public "lihat jadwal": every round a pair/player has played or will play, who against, and the score. */
export function UnitScheduleModal({ name, rows, onClose }: { name: string; rows: UnitMatchRow[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40" onClick={onClose}>
      <div
        className="w-full max-w-[440px] max-h-[80vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-6 text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-display font-bold text-[18px] m-0">{name}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex-none w-8 h-8 rounded-full flex items-center justify-center text-ink/50 hover:bg-ink/6 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-0.5">
          {rows.map((r) => (
            <div key={r.roundNo} className="flex items-center gap-3 py-2.5 border-t border-ink/8 first:border-t-0">
              <div className="flex-none w-9 h-9 rounded-full bg-ink/6 flex items-center justify-center text-xs font-bold text-ink/70">R{r.roundNo}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">vs {r.opponent}</div>
              </div>
              <div className="flex-none text-right">
                {r.result ? (
                  <div className={`font-display font-bold text-base tabular-nums ${RESULT_STYLE[r.result]}`}>{r.mine}–{r.theirs}</div>
                ) : (
                  <div className="text-xs text-ink/40 whitespace-nowrap">belum main</div>
                )}
              </div>
            </div>
          ))}
          {rows.length === 0 && <div className="text-sm text-ink/55 py-2">Belum ada jadwal.</div>}
        </div>
      </div>
    </div>
  );
}
