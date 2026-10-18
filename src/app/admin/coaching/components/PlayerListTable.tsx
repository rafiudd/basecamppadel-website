"use client";

import { Avatar } from "@/components/ui/Avatar";
import { LEVEL_DEFINITIONS } from "@/lib/coaching";
import type { SessionPlayerItem } from "@/lib/coaching-db";

function StatusBadge({ status }: { status: SessionPlayerItem["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${
        status === "submitted"
          ? "bg-[#2F9E5C]/20 text-[#6FD39A]"
          : status === "draft"
          ? "bg-[#FFD43B]/18 text-[#FFD43B]"
          : "bg-[#FBF7F1]/10 text-[#FBF7F1]/75"
      }`}
    >
      {status === "submitted" ? "Terkirim" : status === "draft" ? "Draft" : "Belum dinilai"}
    </span>
  );
}

/** Players for the active session, as a table (desktop) / card list (mobile), split into a
 *  "belum dinilai" and a "selesai dinilai" tab. Clicking a row opens its assessment in a modal. */
export function PlayerListTable({
  filteredPlayers,
  belumCount,
  selesaiCount,
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onSelectPlayer,
}: {
  filteredPlayers: SessionPlayerItem[];
  belumCount: number;
  selesaiCount: number;
  searchQuery: string;
  statusFilter: "belum" | "selesai";
  onSearchChange: (q: string) => void;
  onStatusFilterChange: (s: "belum" | "selesai") => void;
  onSelectPlayer: (index: number) => void;
}) {
  return (
    <div className="bg-[#1F1C2B] rounded-2xl p-3.5 flex flex-col gap-3 border border-[#FBF7F1]/5">
      <div className="flex flex-col sm:flex-row gap-2.5">
        <label className="flex-1 block">
          <span className="sr-only">Cari pemain</span>
          <input
            type="search"
            placeholder="Cari pemain…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-[#FBF7F1]/10 border-0 rounded-lg px-3 py-2.5 min-h-11 font-sans text-[15px] text-[#FBF7F1] w-full box-border focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
          />
        </label>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onStatusFilterChange("belum")}
            className={`flex-1 sm:flex-none border-0 rounded-lg min-h-11 px-4 font-sans font-bold text-sm whitespace-nowrap inline-flex items-center justify-center transition-all cursor-pointer ${
              statusFilter === "belum" ? "bg-[#FFD43B] text-[#17151F]" : "bg-[#FBF7F1]/10 text-[#FBF7F1]/80 hover:text-[#FBF7F1]"
            }`}
          >
            Belum dinilai {belumCount}
          </button>
          <button
            type="button"
            onClick={() => onStatusFilterChange("selesai")}
            className={`flex-1 sm:flex-none border-0 rounded-lg min-h-11 px-4 font-sans font-bold text-sm whitespace-nowrap inline-flex items-center justify-center transition-all cursor-pointer ${
              statusFilter === "selesai" ? "bg-[#FFD43B] text-[#17151F]" : "bg-[#FBF7F1]/10 text-[#FBF7F1]/80 hover:text-[#FBF7F1]"
            }`}
          >
            Selesai dinilai {selesaiCount}
          </button>
        </div>
      </div>

      {filteredPlayers.length === 0 ? (
        <div className="text-center py-10 text-sm text-[#FBF7F1]/50">Tidak ada pemain yang sesuai</div>
      ) : (
        <>
          {/* Desktop table */}
          <table className="hidden lg:table w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-[#FBF7F1]/60 uppercase tracking-wide">
                <th className="pb-2.5 pr-3 font-semibold" />
                <th className="pb-2.5 pr-3 font-semibold">Pemain</th>
                <th className="pb-2.5 pr-3 font-semibold">Grup</th>
                <th className="pb-2.5 pr-3 font-semibold">Level</th>
                <th className="pb-2.5 pr-3 font-semibold">Status</th>
                <th className="pb-2.5" />
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((pItem, idx) => {
                const pLevel = pItem.computedLevel.level;
                const pColor = LEVEL_DEFINITIONS[pLevel]?.color || "#FFD43B";
                return (
                  <tr
                    key={pItem.player.id}
                    onClick={() => onSelectPlayer(idx)}
                    className="border-t border-[#FBF7F1]/8 cursor-pointer hover:bg-[#FBF7F1]/5 transition-colors"
                  >
                    <td className="py-2 pr-3">
                      <Avatar name={pItem.player.name} photoUrl={pItem.player.photo_url} size={34} />
                    </td>
                    <td className="py-2.5 pr-3 font-bold text-[#FBF7F1] whitespace-nowrap">{pItem.player.name}</td>
                    <td className="py-2.5 pr-3 text-[#FBF7F1]/75 whitespace-nowrap">{pItem.group?.name || "Grup 1"}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-[#FBF7F1]/80">
                        <span
                          aria-hidden="true"
                          className="inline-block w-2.5 h-2.5 rounded-full flex-none shadow-[inset_0_0_0_1.5px_rgba(251,247,241,0.45)]"
                          style={{ backgroundColor: pColor }}
                        />
                        {pLevel}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <StatusBadge status={pItem.status} />
                    </td>
                    <td className="py-2.5 pr-1 text-[#FBF7F1]/40 text-right">→</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="lg:hidden flex flex-col gap-1.5">
            {filteredPlayers.map((pItem, idx) => {
              const pLevel = pItem.computedLevel.level;
              const pColor = LEVEL_DEFINITIONS[pLevel]?.color || "#FFD43B";
              return (
                <button
                  key={pItem.player.id}
                  type="button"
                  onClick={() => onSelectPlayer(idx)}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-[#17151F]/40 border border-[#FBF7F1]/5 hover:border-[#FBF7F1]/15 transition-all cursor-pointer"
                >
                  <Avatar name={pItem.player.name} photoUrl={pItem.player.photo_url} size={38} />
                  <div className="flex-grow min-w-0">
                    <span className="block font-bold text-[15px] text-[#FBF7F1] truncate">{pItem.player.name}</span>
                    <span className="flex items-center gap-1.5 text-xs text-[#FBF7F1]/75 truncate mt-0.5">
                      <span
                        aria-hidden="true"
                        className="inline-block w-2.5 h-2.5 rounded-full flex-none shadow-[inset_0_0_0_1.5px_rgba(251,247,241,0.45)]"
                        style={{ backgroundColor: pColor }}
                      />
                      {pLevel} · {pItem.group?.name || "Grup 1"}
                    </span>
                  </div>
                  <StatusBadge status={pItem.status} />
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
