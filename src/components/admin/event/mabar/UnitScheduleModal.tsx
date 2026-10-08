"use client";

import { Modal } from "@/components/ui/Modal";
import { courtNameOf } from "@/lib/compData";
import type { UnitMatchRow } from "@/lib/mabar";
import type { Court } from "@/lib/database.types";

const RESULT_STYLE: Record<string, string> = { W: "text-volt", L: "text-snow/50", D: "text-snow/70" };

/** "Lihat lawan": every round a pair/player has played or will play, who against, and the score. */
export function UnitScheduleModal({
  name,
  rows,
  courts,
  onClose,
}: {
  name: string;
  rows: UnitMatchRow[];
  courts: Pick<Court, "id" | "name">[];
  onClose: () => void;
}) {
  return (
    <Modal title={name} onClose={onClose} width={440}>
      <div className="flex flex-col gap-0.5">
        {rows.map((r) => (
          <div key={r.roundNo} className="flex items-center gap-3 py-2.5 border-t border-snow/8 first:border-t-0">
            <div className="flex-none w-9 h-9 rounded-full bg-snow/8 flex items-center justify-center text-xs font-bold text-snow/75">R{r.roundNo}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">vs {r.opponent}</div>
              <div className="text-2xs text-snow/50">{courtNameOf(courts, r.courtId)}</div>
            </div>
            <div className="flex-none text-right">
              {r.result ? (
                <div className={`font-display font-bold text-base tabular-nums ${RESULT_STYLE[r.result]}`}>{r.mine}–{r.theirs}</div>
              ) : (
                <div className="text-2xs text-snow/40 whitespace-nowrap">belum main</div>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-snow/55 py-2">Belum ada jadwal.</div>}
      </div>
    </Modal>
  );
}
