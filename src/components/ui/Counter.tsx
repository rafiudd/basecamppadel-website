import { invalidIf, labelClass } from "@/components/ui/Field";

/** Value with – / + buttons, empty ("—") until first used; `onChange` gets value ± 1 or `min` (the caller clamps). */
export function Counter({ label, value, min, display, invalid, onChange }: { label: string; value: number | null; min: number; display?: React.ReactNode; invalid?: boolean; onChange: (n: number) => void }) {
  const step = (d: number) => onChange(value == null ? min : value + d);
  const btn = "w-11 h-11 border-none rounded-lg bg-snow/12 text-snow font-bold text-xl p-0 flex-none";
  return (
    <div>
      <div className={labelClass}>{label}</div>
      <div className={`flex items-center gap-1.5 bg-snow/6 rounded-tile p-1 ${invalidIf(invalid)}`}>
        <button type="button" aria-label={`Kurangi ${label}`} onClick={() => step(-1)} className={btn}>–</button>
        <div className={`flex-1 text-center font-display font-bold text-xl ${value == null ? "text-snow/40" : ""}`}>{value == null ? "—" : (display ?? value)}</div>
        <button type="button" aria-label={`Tambah ${label}`} onClick={() => step(1)} className={btn}>+</button>
      </div>
    </div>
  );
}
