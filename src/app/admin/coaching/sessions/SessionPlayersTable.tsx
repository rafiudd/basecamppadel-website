"use client";

import type { Coach, Player } from "@/lib/database.types";
import { Avatar } from "@/components/ui/Avatar";
import { SearchSelect } from "@/components/ui/SearchSelect";
import type { FormGroupItem } from "./SessionGroupsEditor";

export function SessionPlayersTable({
  groups,
  coaches,
  sessionPlayersList,
  filteredSessionPlayers,
  unassignedMasterPlayers,
  playerGroupMap,
  playerSearchQuery,
  onSearchQueryChange,
  onOpenAddModal,
  onAddPlayer,
  onRemovePlayer,
  onAssignPlayerGroup,
  onDistributeEvenly,
}: {
  groups: FormGroupItem[];
  coaches: Coach[];
  sessionPlayersList: Player[];
  filteredSessionPlayers: Player[];
  unassignedMasterPlayers: Player[];
  playerGroupMap: Record<string, string>;
  playerSearchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onOpenAddModal: () => void;
  onAddPlayer: (id: string) => void;
  onRemovePlayer: (id: string) => void;
  onAssignPlayerGroup: (playerId: string, groupId: string) => void;
  onDistributeEvenly: () => void;
}) {
  return (
    <div className="bg-[#221F30] rounded-2xl p-5 lg:p-6 border border-[#FBF7F1]/5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#FBF7F1]/10 pb-2">
        <div>
          <h2 className="font-display font-bold text-lg m-0 text-snow">
            3. Daftar Pemain Sesi &amp; Pembagian Grup ({sessionPlayersList.length} Pemain)
          </h2>
          <p className="text-2xs text-[#FBF7F1]/65 m-0 mt-0.5">
            Tentukan siapa saja pemain yang mengikuti sesi dan atur grup/coach masing-masing pemain.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onDistributeEvenly}
            className="border-0 rounded-lg px-3 py-2 font-bold text-xs bg-[#FBF7F1]/10 text-[#FBF7F1] hover:bg-[#FBF7F1]/15 transition-all cursor-pointer"
          >
            ⇄ Bagi Rata Otomatis
          </button>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="border-0 rounded-lg px-3.5 py-2 font-bold text-xs bg-[#FFD43B] text-[#17151F] hover:bg-[#FFD43B]/90 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span>+</span> Tambah Pemain
          </button>
        </div>
      </div>

      {/* Quick Search Controls: SearchSelect (Event-style) + In-session filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-sm">
          <SearchSelect
            placeholder="+ Cari & tambah pemain langsung..."
            value=""
            onChange={(v) => {
              if (v) onAddPlayer(v);
            }}
            options={unassignedMasterPlayers.map((p) => ({
              value: p.id,
              label: p.name,
              hint: [p.level || "Beginner", (p as any).city || (p as any).region].filter(Boolean).join(" · "),
            }))}
            className="bg-[#FBF7F1]/10 border-0 rounded-lg px-3 py-2 text-xs text-snow focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
          />
        </div>

        {sessionPlayersList.length > 0 && (
          <div className="w-full sm:w-64">
            <input
              type="search"
              placeholder="Cari pemain di sesi ini…"
              value={playerSearchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full bg-[#FBF7F1]/10 border-0 rounded-lg px-3 py-2 text-xs text-snow focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
            />
          </div>
        )}
      </div>

      {/* Session Players Table */}
      <div className="bg-[#1F1C2B] rounded-xl border border-[#FBF7F1]/5 overflow-hidden">
        {sessionPlayersList.length === 0 ? (
          <div className="text-center py-10 text-xs text-[#FBF7F1]/50 flex flex-col items-center gap-2">
            <span>Belum ada pemain di sesi ini.</span>
            <button
              type="button"
              onClick={onOpenAddModal}
              className="text-xs text-[#FFD43B] underline font-bold cursor-pointer"
            >
              + Klik untuk memilih peserta dari database
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#FBF7F1]/10 bg-[#221F30]/70 text-[#FBF7F1]/65 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3.5">Pemain</th>
                  <th className="py-2.5 px-3.5">Level Saat Ini</th>
                  <th className="py-2.5 px-3.5">Ditugaskan ke Grup / Coach</th>
                  <th className="py-2.5 px-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FBF7F1]/6">
                {filteredSessionPlayers.map((player) => {
                  const assignedGroupId = playerGroupMap[player.id] || groups[0]?.id || groups[0]?.tempId;
                  const assignedGroup = groups.find((g) => (g.id || g.tempId) === assignedGroupId) || groups[0];
                  const coachName = coaches.find((c) => c.id === assignedGroup?.coachId)?.name || "Coach";

                  return (
                    <tr key={player.id} className="hover:bg-[#FBF7F1]/3 transition-colors">
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={player.name} size={30} />
                          <span className="font-semibold text-snow">{player.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-xs text-[#FBF7F1]/75">
                        {player.level || "Beginner"}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <select
                          value={assignedGroupId}
                          onChange={(e) => onAssignPlayerGroup(player.id, e.target.value)}
                          className="bg-[#FBF7F1]/10 border-0 rounded-lg px-2.5 py-1.5 text-xs text-snow appearance-auto focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
                        >
                          {groups.map((g) => {
                            const gKey = g.id || g.tempId;
                            const c = coaches.find((x) => x.id === g.coachId);
                            return (
                              <option key={gKey} value={gKey} className="bg-[#17151F]">
                                {g.name} · Coach {c?.name || coachName}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => onRemovePlayer(player.id)}
                          className="text-2xs text-[#FF5A3C] hover:underline font-bold cursor-pointer"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
