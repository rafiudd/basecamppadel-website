"use client";

import { useEffect, useRef, useState } from "react";

type Option = { id: string; label: string };

export function NewMatchModal({
  action,
  sessions,
  courts,
}: {
  action: (fd: FormData) => void;
  sessions: Option[];
  courts: Option[];
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button className="btn btn-coral" onClick={() => setOpen(true)}>+ Match Baru</button>
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) setOpen(false);
        }}
        className="bg-transparent p-0 backdrop:bg-ink/70"
      >
        <form
          action={action}
          className="bg-indigo rounded-2xl p-6 flex flex-col gap-4 w-[min(90vw,420px)] text-snow"
        >
          <div className="font-display font-bold text-lg">Match Baru</div>
          <div>
            <div className="label">Sesi</div>
            <select name="session_id" className="field">
              <option value="">Tanpa sesi</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="label">Court</div>
            <select name="court_id" className="field">
              <option value="">Tanpa court</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn" onClick={() => setOpen(false)}>Batal</button>
            <button type="submit" className="btn btn-coral">Buat Match</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
