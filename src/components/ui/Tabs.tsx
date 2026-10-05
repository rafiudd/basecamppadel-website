"use client";

import Link from "next/link";

export type TabOption<T extends string> = { value: T; label: React.ReactNode; count?: number; href?: string };

/** Pill chips (filters, sub-sections). With `href` options they are links, else buttons calling `onChange`. */
export function ChipTabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: TabOption<T>[];
  value: T;
  onChange?: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-1.5 flex-wrap ${className ?? ""}`}>
      {options.map((o) => {
        const on = o.value === value;
        const cls = `border-none no-underline rounded-full min-h-10 px-4 py-2 text-sm font-semibold whitespace-nowrap ${
          on ? "bg-indigo text-snow" : "bg-ink-3 text-snow/80"
        }`;
        const body = (
          <>
            {o.label}
            {o.count !== undefined && <span className="ml-1 opacity-70 font-medium">{o.count}</span>}
          </>
        );
        return o.href ? (
          <Link key={o.value} href={o.href} aria-current={on ? "page" : undefined} className={cls}>{body}</Link>
        ) : (
          <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange?.(o.value)} className={cls}>{body}</button>
        );
      })}
    </div>
  );
}

/** Two-to-four equal segments on one track (yellow = selected). */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: TabOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-1.5 p-1 rounded-card bg-ink-3 ${className ?? ""}`}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`flex-1 basis-0 border-none rounded-tile min-h-12 px-4 py-2 font-display text-base font-bold ${on ? "bg-volt text-indigo" : "bg-transparent text-snow/80"}`}
          >
            {o.label}
            {o.count !== undefined && <span className="ml-1 font-sans text-caption font-medium opacity-75">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
