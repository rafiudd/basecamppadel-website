import { labelClass } from "@/components/ui/Field";
import { POINT_OPTIONS } from "@/lib/config";

/** Score controls shared by the Live page and Skor Cepat; `big` is the thumb-sized phone variant. */

export function SetStepper({ label, value, team, disabled, big, onStep }: { label: string; value: number; team: string; disabled: boolean; big?: boolean; onStep: (delta: number) => void }) {
  const btn = `${big ? "w-12 h-12" : "w-11 h-11"} border-none rounded-tile p-0 bg-snow/15 text-snow font-bold text-xl flex-none`;
  return (
    <div className="flex-1 basis-0">
      <div className={labelClass}>{label}</div>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`Kurangi ${label} ${team}`} disabled={disabled} onClick={() => onStep(-1)} className={btn}>–</button>
        <div className={`flex-1 text-center font-display font-bold tabular-nums ${big ? "text-score" : "text-2xl"}`}>{value}</div>
        <button type="button" aria-label={`Tambah ${label} ${team}`} disabled={disabled} onClick={() => onStep(1)} className={btn}>+</button>
      </div>
    </div>
  );
}

/** Game count per set; "+" also resets the point score (0/15/30/40/AD) of both teams. */
export function SetSteppers({ sets, team, disabled, big, onStep }: { sets: number[]; team: string; disabled: boolean; big?: boolean; onStep: (idx: 0 | 1, delta: number) => void }) {
  return (
    <div className={`flex ${big ? "gap-3" : "gap-4"}`}>
      {([0, 1] as const).map((i) => (
        <SetStepper key={i} label={`Set ${i + 1}`} value={sets[i] ?? 0} team={team} disabled={disabled} big={big} onStep={(d) => onStep(i, d)} />
      ))}
    </div>
  );
}

export function GameButtons({ value, disabled, big, onPick }: { value: string; disabled: boolean; big?: boolean; onPick: (v: string) => void }) {
  return (
    <div>
      <div className={labelClass}>Skor game</div>
      <div className={`flex ${big ? "gap-1.5" : "gap-2"}`}>
        {POINT_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            aria-pressed={value === opt}
            disabled={disabled}
            onClick={() => onPick(opt)}
            className={`flex-1 basis-0 min-h-11 border-none font-bold text-input ${big ? "py-2.5 rounded-tile" : "py-3 rounded-lg"} ${value === opt ? "bg-volt text-indigo" : "bg-snow/12 text-snow"}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ServeButton({ serving, disabled, big, onClick }: { serving: boolean; disabled: boolean; big?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={serving}
      disabled={disabled}
      onClick={onClick}
      className={`border-none font-bold ${big ? "rounded-tile min-h-12 p-3 text-input" : "rounded-lg min-h-11 px-4.5 py-3 text-sm"} ${serving ? "bg-volt text-indigo" : "bg-snow/12 text-snow"}`}
    >
      {serving ? "Sedang serve" : "Jadikan server"}
    </button>
  );
}

export function StatusNotes({ error, finished, games }: { error: string | null; finished: boolean; games: [number, number] }) {
  return (
    <>
      {error && <div role="alert" className="text-sm text-coral-soft bg-loss/15 rounded-lg px-3 py-2">{error}</div>}
      {finished && <div className="text-sm bg-win/15 text-win-soft rounded-lg px-3 py-2">Match selesai ({games[0]}–{games[1]}). Skor terkunci, koreksi lewat halaman event.</div>}
    </>
  );
}
