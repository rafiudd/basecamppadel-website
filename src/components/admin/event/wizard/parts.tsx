import { invalidIf, labelClass } from "@/components/ui/Field";
import { ShuffleIcon } from "@/components/ui/icons";

/** Small building blocks of the wizard steps. */

export function StepSection({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="bg-ink-2 rounded-2xl p-5 md:p-6 flex flex-col gap-4">
      <div>
        <div className="font-display font-bold text-xl">{title}</div>
        {sub && <div className="text-caption text-snow/70 mt-0.5">{sub}</div>}
      </div>
      {children}
    </section>
  );
}

/** Inner card with a title row and an optional action button on the right. */
export function Panel({ title, sub, action, invalid, children }: { title: string; sub?: string; action?: React.ReactNode; invalid?: boolean; children: React.ReactNode }) {
  return (
    <div className={`bg-ink-3 rounded-card p-4 flex flex-col gap-3 min-w-0 ${invalidIf(invalid)}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="font-display font-bold text-base">{title}</div>
          {sub && <div className="text-caption text-snow/70">{sub}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Selectable card with a radio dot (event type, mabar format). */
export function RadioCard({ on, title, desc, onClick, big, invalid }: { on: boolean; title: string; desc: string; onClick: () => void; big?: boolean; invalid?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`text-left border-none rounded-card ${big ? "p-5" : "p-3.5"} text-snow flex gap-3 items-start ${
        on ? "bg-volt/10 ring-2 ring-inset ring-volt" : "bg-ink-3 ring-1 ring-inset ring-snow/12"
      } ${invalidIf(invalid)}`}
    >
      <span className={`w-5 h-5 rounded-full flex-none mt-0.5 box-border border-2 flex items-center justify-center ${on ? "border-volt" : "border-snow/50"}`}>
        <span className={`w-2.5 h-2.5 rounded-full ${on ? "bg-volt" : ""}`} />
      </span>
      <span className="flex flex-col gap-1">
        <span className={`font-display font-bold ${big ? "text-card" : "text-base"}`}>{title}</span>
        <span className="text-caption leading-normal text-snow/75">{desc}</span>
      </span>
    </button>
  );
}

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

export function ShuffleButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="border-none rounded-lg min-h-10 px-3.5 py-2 font-bold text-sm bg-volt text-indigo flex items-center gap-2 whitespace-nowrap">
      <ShuffleIcon />
      {children}
    </button>
  );
}
