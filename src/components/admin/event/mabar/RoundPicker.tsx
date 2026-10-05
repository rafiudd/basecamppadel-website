/** Round numbers 1..total; played rounds are clickable, future ones are not. */
export function RoundPicker({ total, existing, selected, onSelect }: { total: number; existing: number[]; selected: number; onSelect: (n: number) => void }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
        const exists = existing.includes(n);
        const on = exists && n === selected;
        return (
          <button
            key={n}
            type="button"
            disabled={!exists}
            onClick={() => onSelect(n)}
            aria-current={on ? "step" : undefined}
            aria-label={`Ronde ${n}`}
            className={`flex-none w-11 h-11 rounded-full border-none flex items-center justify-center text-sm font-bold disabled:cursor-default disabled:opacity-100 ${
              on ? "bg-volt text-indigo" : exists ? "bg-snow/85 text-indigo" : "bg-ink-3 text-snow/75"
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
