/** Round numbers 1..total; played rounds are clickable, future ones are not. Finished rounds get a green check badge. */
export function RoundPicker({
  total,
  existing,
  selected,
  done,
  onSelect,
}: {
  total: number;
  existing: number[];
  selected: number;
  done?: Set<number>;
  onSelect: (n: number) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
        const exists = existing.includes(n);
        const on = exists && n === selected;
        const isDone = done?.has(n);
        return (
          <button
            key={n}
            type="button"
            disabled={!exists}
            onClick={() => onSelect(n)}
            aria-current={on ? "step" : undefined}
            aria-label={`Ronde ${n}${isDone ? " (selesai)" : ""}`}
            className={`relative flex-none w-11 h-11 rounded-full border-none flex items-center justify-center text-sm font-bold disabled:cursor-default disabled:opacity-100 ${
              on ? "bg-volt text-indigo" : exists ? "bg-snow/85 text-indigo" : "bg-ink-3 text-snow/75"
            }`}
          >
            {n}
            {isDone && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-win border-2 border-ink flex items-center justify-center">
                <svg viewBox="0 0 12 12" className="w-2 h-2" fill="none">
                  <path d="M2.5 6.2 L5 8.5 L9.5 3.2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
