/** Form building blocks for the dark admin. Pair with the `.field` / `.label` classes in globals.css. */

export const inputClass =
  "bg-snow/10 border-none rounded-lg px-3 py-2.5 min-h-11 text-input text-snow w-full box-border outline-none focus:ring-2 focus:ring-inset focus:ring-volt scheme-dark";

/** Compact select/input used inside rows (team pickers, court/time per match). */
export const compactInputClass =
  "border-none rounded-lg bg-snow/10 text-snow text-sm min-h-10 box-border outline-none focus:ring-2 focus:ring-inset focus:ring-volt disabled:opacity-60";

export const labelClass = "block text-xs tracking-caps text-snow/65 uppercase mb-2";

/** Red outline for a field that still has to be filled (wins over the yellow focus ring). */
export const invalidClass = "ring-2! ring-inset! ring-loss!";
export const invalidIf = (invalid: boolean | undefined) => (invalid ? invalidClass : "");

/** <label> with the uppercase caption above its control. */
export function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

/** Checkbox with its text, 44px tall so it is easy to hit. */
export function CheckboxField({ children, ...input }: React.InputHTMLAttributes<HTMLInputElement> & { children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2.5 text-sm min-h-11 cursor-pointer">
      <input type="checkbox" className="w-4.5 h-4.5 accent-volt flex-none" {...input} />
      {children}
    </label>
  );
}
