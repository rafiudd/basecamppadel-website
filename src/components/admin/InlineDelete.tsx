"use client";

import { useState } from "react";
import { TrashIcon } from "@/components/ui/icons";

/** Trash button that turns into "Hapus … ini? Batal / Ya, hapus" in place, then posts `id` to `action`. */
export function InlineDelete({
  action,
  id,
  name,
  noun,
  children,
}: {
  action: (fd: FormData) => Promise<void>;
  id: string;
  name: string;
  noun: string;
  children?: React.ReactNode;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <div className="flex items-center gap-1 justify-end">
        {children}
        <button type="button" onClick={() => setAsking(true)} aria-label={`Hapus ${name}`} className="w-10 h-10 rounded-lg bg-transparent border-none text-snow/70 hover:text-loss flex items-center justify-center p-0 flex-none">
          <TrashIcon />
        </button>
      </div>
    );
  }
  return (
    // data-confirm-delete lets a parent card highlight itself while asking (has-[[data-confirm-delete]]:…)
    <form action={action} data-confirm-delete className="flex items-center gap-2 justify-end flex-wrap">
      <input type="hidden" name="id" value={id} />
      <span className="text-caption text-snow/85">Hapus {noun} ini?</span>
      <button type="button" onClick={() => setAsking(false)} className="btn bg-transparent text-snow/85 min-h-10 px-4.5 tracking-button">Batal</button>
      <button type="submit" className="btn btn-danger min-h-10 px-4.5 tracking-button">Ya, hapus</button>
    </form>
  );
}
