"use client";

import { useEffect } from "react";

interface DeletePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetName: string;
  onConfirm: () => void | Promise<void>;
  isDeleting?: boolean;
  errorMessage?: string | null;
}

export function DeletePresetModal({
  isOpen,
  onClose,
  presetName,
  onConfirm,
  isDeleting = false,
  errorMessage = null,
}: DeletePresetModalProps) {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-preset-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-sm animate-fade-in"
      onClick={() => {
        if (!isDeleting) onClose();
      }}
    >
      <div
        className="bg-ink-2 border border-snow/10 rounded-2xl p-6 md:p-7 max-w-[420px] w-full text-snow shadow-2xl flex flex-col gap-4 relative animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close (X) button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          aria-label="Tutup dialog"
          className="absolute top-4 right-4 text-snow/40 hover:text-snow transition-colors disabled:opacity-50 p-1 cursor-pointer"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Warning / Trash Icon */}
        <div className="w-12 h-12 rounded-full bg-loss/15 text-loss flex items-center justify-center flex-none">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>

        {/* Title and Content */}
        <div className="flex flex-col gap-1.5">
          <h2
            id="delete-preset-title"
            className="font-display font-bold text-xl text-snow m-0"
          >
            Hapus Preset Poin?
          </h2>
          <p className="text-sm text-snow/75 leading-relaxed m-0">
            Apakah Anda yakin ingin menghapus preset{" "}
            <span className="font-bold text-snow">&ldquo;{presetName}&rdquo;</span>?
            Kategori dan bobot poin yang tersimpan pada preset ini akan dihapus secara permanen.
          </p>
        </div>

        {/* Error notification if delete failed */}
        {errorMessage && (
          <div className="bg-loss/20 border border-loss/40 rounded-xl p-3 text-xs text-snow">
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="btn bg-snow/10 hover:bg-snow/15 text-snow text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="btn bg-loss hover:bg-loss/90 text-snow text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {isDeleting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-snow"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <span>Menghapus...</span>
              </>
            ) : (
              "Hapus Preset"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
