"use client";

import { Avatar } from "@/components/ui/Avatar";
import { LEVEL_DEFINITIONS } from "@/lib/coaching";
import type { SessionFullData, SessionPlayerItem } from "@/lib/coaching-db";

export function PlayerSidebarList({
  filteredPlayers,
  currentPlayerItem,
  sessionData,
  searchQuery,
  statusFilter,
  showMobilePlayerPicker,
  onSearchChange,
  onStatusFilterChange,
  onSelectPlayer,
}: {
  filteredPlayers: SessionPlayerItem[];
  currentPlayerItem: SessionPlayerItem | null;
  sessionData: SessionFullData | null;
  searchQuery: string;
  statusFilter: "semua" | "belum" | "draft" | "terkirim";
  showMobilePlayerPicker: boolean;
  onSearchChange: (q: string) => void;
  onStatusFilterChange: (s: "semua" | "belum" | "draft" | "terkirim") => void;
  onSelectPlayer: (index: number) => void;
}) {
  return (
    <div
      className={`${
        showMobilePlayerPicker ? "flex" : "hidden lg:flex"
      } bg-[#1F1C2B] rounded-2xl p-3.5 flex-col gap-1.5 border border-[#FBF7F1]/5`}
    >
      {/* Search Pemain */}
      <label className="block mb-1.5">
        <span className="sr-only">Cari pemain</span>
        <input
          type="search"
          placeholder="Cari pemain…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-[#FBF7F1]/10 border-0 rounded-lg px-3 py-2.5 min-h-11 font-sans text-[15px] text-[#FBF7F1] w-full box-border focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
        />
      </label>

      {/* Status Filter Tabs */}
      <div className="flex gap-1.5 mb-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => onStatusFilterChange("semua")}
          className={`border-0 rounded-lg min-h-9 px-3 font-sans font-bold text-[13px] whitespace-nowrap inline-flex items-center justify-center transition-all cursor-pointer ${
            statusFilter === "semua"
              ? "bg-[#FBF7F1]/16 text-[#FBF7F1]"
              : "bg-transparent text-[#FBF7F1]/75 hover:text-[#FBF7F1]"
          }`}
        >
          Semua {sessionData?.progress.total ?? 0}
        </button>
        <button
          type="button"
          onClick={() => onStatusFilterChange("belum")}
          className={`border-0 rounded-lg min-h-9 px-3 font-sans font-bold text-[13px] whitespace-nowrap inline-flex items-center justify-center transition-all cursor-pointer ${
            statusFilter === "belum"
              ? "bg-[#FBF7F1]/16 text-[#FBF7F1]"
              : "bg-transparent text-[#FBF7F1]/75 hover:text-[#FBF7F1]"
          }`}
        >
          Belum {(sessionData?.progress.total ?? 0) - (sessionData?.progress.rated ?? 0)}
        </button>
        <button
          type="button"
          onClick={() => onStatusFilterChange("draft")}
          className={`border-0 rounded-lg min-h-9 px-3 font-sans font-bold text-[13px] whitespace-nowrap inline-flex items-center justify-center transition-all cursor-pointer ${
            statusFilter === "draft"
              ? "bg-[#FBF7F1]/16 text-[#FBF7F1]"
              : "bg-transparent text-[#FBF7F1]/75 hover:text-[#FBF7F1]"
          }`}
        >
          Draft {sessionData?.progress.draft ?? 0}
        </button>
        <button
          type="button"
          onClick={() => onStatusFilterChange("terkirim")}
          className={`border-0 rounded-lg min-h-9 px-3 font-sans font-bold text-[13px] whitespace-nowrap inline-flex items-center justify-center transition-all cursor-pointer ${
            statusFilter === "terkirim"
              ? "bg-[#FBF7F1]/16 text-[#FBF7F1]"
              : "bg-transparent text-[#FBF7F1]/75 hover:text-[#FBF7F1]"
          }`}
        >
          Terkirim {sessionData?.progress.submitted ?? 0}
        </button>
      </div>

      {/* Player Cards List (Matches Prototype styling) */}
      <div className="flex flex-col gap-1 max-h-[680px] overflow-y-auto pr-0.5">
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#FBF7F1]/50">
            Tidak ada pemain yang sesuai
          </div>
        ) : (
          filteredPlayers.map((pItem, idx) => {
            const isSelected = pItem.player.id === currentPlayerItem?.player.id;
            const pLevel = pItem.computedLevel.level;
            const pColor = LEVEL_DEFINITIONS[pLevel]?.color || "#FFD43B";

            return (
              <button
                key={pItem.player.id}
                type="button"
                onClick={() => onSelectPlayer(idx)}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#FFD43B]/10 border border-[#FFD43B]/50"
                    : "bg-transparent border border-transparent hover:bg-[#FBF7F1]/5"
                }`}
              >
                <Avatar name={pItem.player.name} photoUrl={pItem.player.photo_url} size={34} />
                <div className="flex-grow min-w-0">
                  <span className="block font-bold text-[15px] text-[#FBF7F1] truncate">
                    {pItem.player.name}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-[#FBF7F1]/75 truncate mt-0.5">
                    <span
                      aria-hidden="true"
                      className="inline-block w-2.5 h-2.5 rounded-full flex-none shadow-[inset_0_0_0_1.5px_rgba(251,247,241,0.45)]"
                      style={{ backgroundColor: pColor }}
                    />
                    <span>
                      {pLevel} · {pItem.group?.name || "Grup 1"}
                    </span>
                  </span>
                </div>

                {/* Status Badge */}
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${
                    pItem.status === "submitted"
                      ? "bg-[#2F9E5C]/20 text-[#6FD39A]"
                      : pItem.status === "draft"
                      ? "bg-[#FFD43B]/18 text-[#FFD43B]"
                      : "bg-[#FBF7F1]/10 text-[#FBF7F1]/75"
                  }`}
                >
                  {pItem.status === "submitted"
                    ? "Terkirim"
                    : pItem.status === "draft"
                    ? "Draft"
                    : "Belum"}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
