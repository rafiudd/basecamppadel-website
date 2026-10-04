"use client";

import { CloseIcon } from "@/components/ui/icons";

/** Centered dialog on a dimmed backdrop; clicking the backdrop or × closes it. */
export function Modal({
  title,
  onClose,
  width = 440,
  children,
}: {
  title: string;
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{ width: `min(100%, ${width}px)` }}
        className="bg-ink-3 rounded-2xl p-6 max-h-modal overflow-y-auto border border-snow/10 shadow-2xl flex flex-col gap-4"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="font-display font-bold text-xl">{title}</div>
          <CloseButton onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}

export function CloseButton({ onClick, label = "Tutup" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="w-9 h-9 bg-transparent border-none text-snow/80 p-0 flex items-center justify-center">
      <CloseIcon />
    </button>
  );
}
