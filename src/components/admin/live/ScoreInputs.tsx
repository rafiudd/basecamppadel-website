import { labelClass } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { POINT_OPTIONS } from "@/lib/config";

/**
 * Score controls shared by the Live page and Skor Cepat; `big` is the thumb-sized phone variant.
 * `loading` marks the control whose save is in flight (Skor Cepat waits for the save before showing it).
 */

export function SetStepper({
  label,
  value,
  team,
  disabled,
  big,
  loading,
  onStep,
}: {
  label: string;
  value: number;
  team: string;
  disabled: boolean;
  big?: boolean;
  /** delta (-1 / 1) of the button that is saving */
  loading?: number | null;
  onStep: (delta: number) => void;
}) {
  const btn = `${big ? "w-12 h-12" : "w-11 h-11"} border-none rounded-tile p-0 bg-snow/15 text-snow font-bold text-xl flex-none flex items-center justify-center`;
  return (
    <div className="flex-1 basis-0">
      <div className={labelClass}>{label}</div>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`Kurangi ${label} ${team}`} aria-busy={loading === -1} disabled={disabled} onClick={() => onStep(-1)} className={btn}>
          {loading === -1 ? <Spinner className="text-snow" /> : "–"}
        </button>
        <div className={`flex-1 text-center font-display font-bold tabular-nums ${big ? "text-score" : "text-2xl"}`}>{value}</div>
        <button type="button" aria-label={`Tambah ${label} ${team}`} aria-busy={loading === 1} disabled={disabled} onClick={() => onStep(1)} className={btn}>
          {loading === 1 ? <Spinner className="text-snow" /> : "+"}
        </button>
      </div>
    </div>
  );
}

/** Game count per set; "+" also resets the point score (0/15/30/40/AD) of both teams. */
export function SetSteppers({
  sets,
  team,
  disabled,
  big,
  loading,
  onStep,
}: {
  sets?: number[] | null;
  team: string;
  disabled: boolean;
  big?: boolean;
  loading?: { idx: 0 | 1; delta: number } | null;
  onStep: (idx: 0 | 1, delta: number) => void;
}) {
  return (
    <div className={`flex ${big ? "gap-3" : "gap-4"}`}>
      {([0, 1] as const).map((i) => (
        <SetStepper
          key={i}
          label={`Set ${i + 1}`}
          value={sets?.[i] ?? 0}
          team={team}
          disabled={disabled}
          big={big}
          loading={loading?.idx === i ? loading.delta : null}
          onStep={(d) => onStep(i, d)}
        />
      ))}
    </div>
  );
}

export function GameButtons({
  value,
  disabled,
  big,
  loading,
  onPick,
}: {
  value: string;
  disabled: boolean;
  big?: boolean;
  /** point value whose save is in flight */
  loading?: string | null;
  onPick: (v: string) => void;
}) {
  return (
    <div>
      <div className={labelClass}>Skor game</div>
      <div className={`flex ${big ? "gap-1.5" : "gap-2"}`}>
        {POINT_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            aria-pressed={value === opt}
            aria-busy={loading === opt}
            disabled={disabled}
            onClick={() => onPick(opt)}
            className={`flex-1 basis-0 min-h-11 border-none font-bold text-input flex items-center justify-center ${big ? "py-2.5 rounded-tile" : "py-3 rounded-lg"} ${value === opt ? "bg-volt text-indigo" : "bg-snow/12 text-snow"}`}
          >
            {loading === opt ? <Spinner className={value === opt ? "text-indigo" : "text-snow"} /> : opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ServeButton({ serving, disabled, big, loading, onClick }: { serving: boolean; disabled: boolean; big?: boolean; loading?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={serving}
      aria-busy={loading}
      disabled={disabled}
      onClick={onClick}
      className={`border-none font-bold flex items-center justify-center gap-2 ${big ? "rounded-tile min-h-12 p-3 text-input" : "rounded-lg min-h-11 px-4.5 py-3 text-sm"} ${serving ? "bg-volt text-indigo" : "bg-snow/12 text-snow"}`}
    >
      {loading && <Spinner className={serving ? "text-indigo" : "text-snow"} />}
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
