"use client";

import { unwrap } from "@/lib/actionState";
import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { LEVEL_DEFINITIONS, LEVEL_NAMES, type PlayerLevelName } from "@/lib/coaching";
import { overridePlayerLevelAction } from "../actions";
import { toast } from "@/components/ui/Toast";

export function OverrideLevelModal({
  playerId,
  playerName,
  sessionId,
  currentLevel,
  currentReason,
  onClose,
  onSuccess,
}: {
  playerId: string;
  playerName: string;
  sessionId?: string;
  currentLevel: PlayerLevelName;
  currentReason?: string;
  onClose: () => void;
  onSuccess: (newLevel: PlayerLevelName) => void;
}) {
  const [selectedLevel, setSelectedLevel] = useState<PlayerLevelName>(currentLevel);
  const [reason, setReason] = useState(currentReason || "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Alasan override level wajib diisi.");
      toast.error("Alasan override level wajib diisi.");
      return;
    }

    startTransition(async () => {
      try {
        unwrap(await overridePlayerLevelAction({
          playerId,
          sessionId,
          overrideLevel: selectedLevel,
          overrideReason: reason.trim(),
        }));
        toast.success(`Level ${playerName} berhasil diubah ke ${selectedLevel}`);
        onSuccess(selectedLevel);
        onClose();
      } catch (err: any) {
        setError(err.message || "Gagal mengubah level");
        toast.error(err.message || "Gagal mengubah level");
      }
    });
  };

  return (
    <Modal title={`Ubah Level · ${playerName}`} onClose={onClose} width={480}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-snow">
        <p className="text-xs text-snow/70">
          Level pemain normalnya dihitung otomatis dari nilai coaching. Anda bisa melakukan override secara manual dengan mencantumkan alasan yang jelas.
        </p>

        {error && (
          <div className="bg-coral/20 border border-coral text-coral-soft px-3 py-2 rounded-lg text-xs">
            {error}
          </div>
        )}

        {/* Level selection */}
        <div>
          <label className="block text-2xs uppercase tracking-wider text-snow/60 mb-2">
            Pilih Level Baru
          </label>
          <div className="flex flex-col gap-2">
            {LEVEL_NAMES.map((lvl) => {
              const def = LEVEL_DEFINITIONS[lvl];
              const isSelected = selectedLevel === lvl;
              return (
                <label
                  key={lvl}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-snow/15 border-volt"
                      : "bg-ink-2 border-snow/10 hover:border-snow/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="level"
                      value={lvl}
                      checked={isSelected}
                      onChange={() => setSelectedLevel(lvl)}
                      className="accent-volt w-4 h-4"
                    />
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full inline-block border border-snow/30"
                        style={{ backgroundColor: def.color }}
                      />
                      <span className="font-bold text-sm">{def.name}</span>
                    </div>
                  </div>
                  <span className="text-xs text-snow/50">
                    Nilai &gt;= {def.minAvg}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-2xs uppercase tracking-wider text-snow/60 mb-1">
            Alasan Override <span className="text-coral">*</span>
          </label>
          <textarea
            required
            rows={3}
            placeholder="Contoh: Eks atlet tenis nasional, memiliki skill di atas rata-rata group clinic."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-snow/10 border border-snow/15 rounded-lg p-3 text-sm text-snow focus:outline-none focus:border-volt resize-vertical"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-snow/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-snow/70 hover:text-snow"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            data-loading={isPending || undefined}
            className="bg-coral text-ink font-bold text-xs px-5 py-2.5 rounded-lg hover:bg-coral/90 disabled:opacity-50"
          >
            {isPending ? "Menyimpan..." : "Simpan Override Level"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
