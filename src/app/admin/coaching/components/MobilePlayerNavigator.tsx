"use client";

import { Avatar } from "@/components/ui/Avatar";
import { LEVEL_DEFINITIONS } from "@/lib/coaching";
import type { SessionPlayerItem } from "@/lib/coaching-db";

export function MobilePlayerNavigator({
  currentPlayerItem,
  activePlayerIndex,
  totalPlayers,
  onPrevPlayer,
  onNextPlayer,
  onToggleMobilePicker,
}: {
  currentPlayerItem: SessionPlayerItem | null;
  activePlayerIndex: number;
  totalPlayers: number;
  onPrevPlayer: () => void;
  onNextPlayer: () => void;
  onToggleMobilePicker: () => void;
}) {
  if (!currentPlayerItem) return null;

  return (
    <div className="lg:hidden bg-[#221F30] rounded-2xl p-3 flex items-center gap-2 border border-[#FBF7F1]/5">
      <button
        type="button"
        aria-label="Pemain sebelumnya"
        disabled={activePlayerIndex === 0}
        onClick={onPrevPlayer}
        className="w-11 h-11 border-0 rounded-xl bg-[#FBF7F1]/10 text-[#FBF7F1] text-lg font-bold flex-none flex items-center justify-center disabled:opacity-30 cursor-pointer"
      >
        ‹
      </button>
      <div
        className="flex-grow min-w-0 text-center cursor-pointer"
        onClick={onToggleMobilePicker}
      >
        <div className="flex items-center justify-center gap-2">
          <Avatar name={currentPlayerItem.player.name} photoUrl={currentPlayerItem.player.photo_url} size={28} />
          <span className="font-display font-bold text-lg truncate">
            {currentPlayerItem.player.name}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${
              currentPlayerItem.status === "submitted"
                ? "bg-[#2F9E5C]/20 text-[#6FD39A]"
                : currentPlayerItem.status === "draft"
                ? "bg-[#FFD43B]/18 text-[#FFD43B]"
                : "bg-[#FBF7F1]/10 text-[#FBF7F1]/75"
            }`}
          >
            {currentPlayerItem.status === "submitted"
              ? "Terkirim"
              : currentPlayerItem.status === "draft"
              ? "Draft"
              : "Belum"}
          </span>
        </div>
        <div className="text-xs text-[#FBF7F1]/70 mt-0.5 flex items-center justify-center gap-1.5 flex-wrap">
          <span
            aria-hidden="true"
            className="inline-block w-2.5 h-2.5 rounded-full flex-none shadow-[inset_0_0_0_1.5px_rgba(251,247,241,0.45)]"
            style={{
              backgroundColor:
                LEVEL_DEFINITIONS[currentPlayerItem.computedLevel.level]?.color || "#FFD43B",
            }}
          />
          <span>
            {currentPlayerItem.computedLevel.level} · {currentPlayerItem.group?.name || "Grup 1"} · pemain {activePlayerIndex + 1} dari {totalPlayers}
          </span>
        </div>
      </div>
      <button
        type="button"
        aria-label="Pemain berikutnya"
        disabled={activePlayerIndex >= totalPlayers - 1}
        onClick={onNextPlayer}
        className="w-11 h-11 border-0 rounded-xl bg-[#FBF7F1]/10 text-[#FBF7F1] text-lg font-bold flex-none flex items-center justify-center disabled:opacity-30 cursor-pointer"
      >
        ›
      </button>
    </div>
  );
}
