"use client";

import { useSyncExternalStore } from "react";
import { CheckIcon, CloseIcon } from "@/components/ui/icons";

/**
 * App-wide toasts. `toast.success(…)` / `toast.error(…)` work from any client code (no context
 * needed); <Toaster /> in the admin layout renders them, so a toast survives a navigation.
 */

type Tone = "success" | "error";
type Item = { id: number; tone: Tone; message: string };

const MAX = 4;
const DURATION: Record<Tone, number> = { success: 3000, error: 6000 };
const EMPTY: Item[] = [];

let items: Item[] = EMPTY;
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

function push(tone: Tone, message: string) {
  // The same message twice in a row (double tap, two forms) shows once.
  if (items.at(-1)?.message === message) return;
  const id = ++seq;
  items = [...items.slice(-(MAX - 1)), { id, tone, message }];
  emit();
  setTimeout(() => dismiss(id), DURATION[tone]);
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  /** Toast an action result (`{ error }` or ok) and return whether it succeeded. */
  result(res: { error?: string } | null | undefined, successText: string | false): boolean {
    if (res?.error) {
      push("error", res.error);
      return false;
    }
    if (successText) push("success", successText);
    return true;
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => items, () => EMPTY);
  return (
    <div className="fixed z-70 top-3 inset-x-0 px-4 md:top-4 md:left-auto md:right-4 md:px-0 flex flex-col items-center md:items-end gap-2 pointer-events-none">
      {list.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className="animate-toast-in pointer-events-auto w-full max-w-90 bg-ink-3 border border-snow/12 rounded-card shadow-pop pl-3.5 pr-1.5 py-2 flex items-center gap-3 text-snow"
        >
          <span
            className={`flex-none w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              t.tone === "success" ? "bg-win/25 text-win-soft" : "bg-loss/25 text-coral-soft"
            }`}
          >
            {t.tone === "success" ? <CheckIcon size={14} strokeWidth={3} /> : "!"}
          </span>
          <span className="flex-1 min-w-0 text-sm font-semibold leading-label py-1">{t.message}</span>
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => dismiss(t.id)}
            className="flex-none w-9 h-9 border-none bg-transparent p-0 text-snow/60 hover:text-snow flex items-center justify-center"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
