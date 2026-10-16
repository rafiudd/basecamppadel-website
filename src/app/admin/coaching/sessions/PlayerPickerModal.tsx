"use client";

import { useState } from "react";
import type { Player } from "@/lib/database.types";
import { LEVEL_NAMES } from "@/lib/coaching";
import { Avatar } from "@/components/ui/Avatar";
import { GenderBadge } from "@/components/ui/Badge";
import { SearchIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";

/**
 * Searchable player picker modal with search input, level filters, avatar,
 * and bulk select matching the event participant checklist pattern.
 */
export function PlayerPickerModal({
  isOpen,
  onClose,
  allPlayers,
  sessionPlayerIds,
  onTogglePlayer,
  onSelectAllShown,
  onClearAll,
}: {
  isOpen: boolean;
  onClose: () => void;
  allPlayers: Player[];
  sessionPlayerIds: string[];
  onTogglePlayer: (id: string) => void;
  onSelectAllShown: (ids: string[]) => void;
  onClearAll: () => void;
}) {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");

  if (!isOpen) return null;

  const filtered = allPlayers.filter((p) => {
    if (levelFilter !== "all" && (p.level || "Beginner") !== levelFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.level && p.level.toLowerCase().includes(q)) ||
      Boolean(p.region && p.region.toLowerCase().includes(q))
    );
  });

  return (
    <Modal title="Pilih Peserta Sesi Coaching" onClose={onClose} width={580}>
      <div className="flex flex-col gap-3.5 -mt-1 text-snow">
        {/* Search Bar */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-3 text-snow/70" size={18} />
          <input
            type="search"
            autoFocus
            aria-label="Cari pemain"
            placeholder="Cari pemain (nama, level, kota)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#FBF7F1]/10 border-0 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-snow placeholder:text-snow/50 focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
          />
        </div>

        {/* Level filter pills & stats */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            {["all", ...LEVEL_NAMES].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevelFilter(lvl)}
                className={`px-2.5 py-1 rounded-full text-2xs font-semibold transition-all cursor-pointer ${
                  levelFilter === lvl
                    ? "bg-[#FFD43B] text-[#17151F] font-bold"
                    : "bg-[#FBF7F1]/10 text-[#FBF7F1]/75 hover:bg-[#FBF7F1]/15"
                }`}
              >
                {lvl === "all" ? "Semua Level" : lvl}
              </button>
            ))}
          </div>

          <div className="text-2xs font-bold text-[#FFD43B]">
            {sessionPlayerIds.length} / {allPlayers.length} dipilih
          </div>
        </div>

        {/* Quick select actions */}
        <div className="flex items-center justify-between text-caption px-0.5">
          <button
            type="button"
            onClick={() => onSelectAllShown(filtered.map((p) => p.id))}
            className="border-none bg-transparent p-0 text-xs font-semibold text-[#FFD43B] hover:underline cursor-pointer"
          >
            Pilih semua hasil ({filtered.length})
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="border-none bg-transparent p-0 text-xs font-semibold text-snow/70 hover:text-coral-soft cursor-pointer"
          >
            Kosongkan pilihan
          </button>
        </div>

        {/* Player Checklist */}
        <div className="max-h-80 overflow-y-auto divide-y divide-[#FBF7F1]/8 bg-[#17151F]/40 rounded-xl p-1 border border-[#FBF7F1]/6">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#FBF7F1]/50">
              Tidak ada pemain yang cocok dengan pencarian &ldquo;{search}&rdquo;
            </div>
          ) : (
            filtered.map((p) => {
              const isSelected = sessionPlayerIds.includes(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                    isSelected ? "bg-[#FBF7F1]/8" : "hover:bg-[#FBF7F1]/4"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onTogglePlayer(p.id)}
                    className="w-4 h-4 accent-[#FFD43B] flex-none rounded"
                  />
                  <Avatar name={p.name} photoUrl={p.photo_url} size={32} />
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-sm text-snow truncate">{p.name}</span>
                    <span className="block text-2xs text-[#FBF7F1]/65 truncate">
                      {[p.level || "Beginner", p.region].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {p.gender && <GenderBadge gender={p.gender as "M" | "F"} />}
                </label>
              );
            })
          )}
        </div>

        {/* Modal footer button */}
        <div className="flex justify-end pt-2 border-t border-[#FBF7F1]/10">
          <button
            type="button"
            onClick={onClose}
            className="border-0 rounded-lg min-h-10 px-5 font-sans font-bold text-sm bg-[#FFD43B] text-[#17151F] hover:bg-[#FFD43B]/90 transition-all shadow-sm cursor-pointer"
          >
            Selesai ({sessionPlayerIds.length} Pemain Dipilih)
          </button>
        </div>
      </div>
    </Modal>
  );
}
