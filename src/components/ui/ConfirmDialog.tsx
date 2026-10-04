"use client";

import { useEffect, useRef } from "react";
import { Modal } from "@/components/ui/Modal";

/** In-app replacement for window.confirm: a message with Batal / confirm buttons. */
export function ConfirmDialog({
  title = "Konfirmasi",
  message,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => confirmRef.current?.focus(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <Modal title={title} onClose={onCancel} width={420}>
      <p className="text-sm leading-relaxed text-snow/80 m-0">{message}</p>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="btn bg-transparent text-snow/85 min-h-10">Batal</button>
        <button type="button" ref={confirmRef} onClick={onConfirm} className={`btn min-h-10 ${danger ? "bg-loss text-snow" : "btn-volt"}`}>
          {confirmLabel ?? (danger ? "Ya, hapus" : "Ya, lanjutkan")}
        </button>
      </div>
    </Modal>
  );
}
