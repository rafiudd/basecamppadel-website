"use client";

import { useState } from "react";
import type { Coach, Player } from "@/lib/database.types";
import { LEVEL_NAMES } from "@/lib/coaching";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SearchSelect } from "@/components/ui/SearchSelect";
import type { FormGroupItem } from "./SessionGroupsEditor";

type SortKey = "name" | "level" | "group";

/** Group color as a translucent fill / outline (group colors are free-form CSS colors). */
const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export function SessionPlayersTable({
  groups,
  coaches,
  sessionPlayersList,
  filteredSessionPlayers,
  unassignedMasterPlayers,
  playerGroupMap,
  addTargetId,
  onAddTargetChange,
  playerSearchQuery,
  onSearchQueryChange,
  onOpenAddModal,
  onAddPlayer,
  onRemovePlayers,
  onAssignPlayerGroup,
  onDistributeEvenly,
}: {
  groups: FormGroupItem[];
  coaches: Coach[];
  sessionPlayersList: Player[];
  filteredSessionPlayers: Player[];
  unassignedMasterPlayers: Player[];
  playerGroupMap: Record<string, string>;
  /** Group that newly added players go into. */
  addTargetId: string;
  onAddTargetChange: (groupId: string) => void;
  playerSearchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onOpenAddModal: () => void;
  onAddPlayer: (id: string) => void;
  onRemovePlayers: (ids: string[]) => void;
  onAssignPlayerGroup: (playerIds: string[], groupId: string) => void;
  onDistributeEvenly: () => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const [picked, setPicked] = useState<string[]>([]);
  const [pendingBatchMove, setPendingBatchMove] = useState<{ groupId: string; label: string } | null>(null);

  // Checked players that are still in the session (a removed player drops out of the selection)
  const selected = picked.filter((id) => sessionPlayersList.some((p) => p.id === id));
  const shownIds = filteredSessionPlayers.map((p) => p.id);
  const allShownSelected = shownIds.length > 0 && shownIds.every((id) => selected.includes(id));
  const someShownSelected = shownIds.some((id) => selected.includes(id));
  const toggleOne = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAllShown = () =>
    setPicked((prev) =>
      allShownSelected ? prev.filter((id) => !shownIds.includes(id)) : [...new Set([...prev, ...shownIds])]
    );
  const moveSelected = (groupId: string) => {
    const target = groups.find((g) => groupKey(g) === groupId);
    setPendingBatchMove({
      groupId,
      label: target ? `${target.name} · ${coachName(target)}` : "grup tujuan",
    });
  };
  const confirmMoveSelected = () => {
    if (!pendingBatchMove) return;
    onAssignPlayerGroup(selected, pendingBatchMove.groupId);
    setPicked([]);
    setPendingBatchMove(null);
  };
  const removeSelected = () => {
    if (!confirm(`Hapus ${selected.length} pemain dari sesi ini?`)) return;
    onRemovePlayers(selected);
    setPicked([]);
  };

  const groupKey = (g: FormGroupItem) => g.id || g.tempId;
  const coachName = (g: FormGroupItem | undefined) => coaches.find((c) => c.id === g?.coachId)?.name || "Coach";
  const groupOf = (playerId: string) => groups.find((g) => groupKey(g) === playerGroupMap[playerId]) || groups[0];
  const addTarget = groups.find((g) => groupKey(g) === addTargetId);

  const sortValue: Record<SortKey, (p: Player) => number | string> = {
    name: (p) => p.name.toLowerCase(),
    level: (p) => LEVEL_NAMES.indexOf((p.level || "Beginner") as (typeof LEVEL_NAMES)[number]),
    group: (p) => groups.indexOf(groupOf(p.id)),
  };
  const sortedPlayers = [...filteredSessionPlayers].sort((a, b) => {
    const va = sortValue[sort.key](a);
    const vb = sortValue[sort.key](b);
    if (va !== vb) return (va < vb ? -1 : 1) * sort.dir;
    return a.name.localeCompare(b.name); // ties by name
  });
  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));

  const sortHeader = (key: SortKey, label: string) => {
    const active = sort.key === key;
    return (
      <th className="py-2.5 px-3.5" aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
        <button
          type="button"
          onClick={() => toggleSort(key)}
          className={`inline-flex items-center gap-1 bg-transparent border-0 p-0 uppercase tracking-wider font-semibold text-xs cursor-pointer hover:text-snow ${
            active ? "text-snow" : "text-inherit"
          }`}
        >
          {label}
          <span aria-hidden className={active ? "text-[#FFD43B]" : "opacity-40"}>
            {active ? (sort.dir === 1 ? "▲" : "▼") : "↕"}
          </span>
        </button>
      </th>
    );
  };

  return (
    <>
      {pendingBatchMove && (
        <ConfirmDialog
          title="Pindahkan pemain terpilih"
          message={
            <>
              Pindahkan <strong>{selected.length}</strong> pemain yang dipilih ke <strong>{pendingBatchMove.label}</strong>?
            </>
          }
          confirmLabel="Ya, pindahkan"
          onConfirm={confirmMoveSelected}
          onCancel={() => setPendingBatchMove(null)}
        />
      )}

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

        {/* Quick Search Controls: SearchSelect (Event-style) + target group + In-session filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
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
                  hint: [p.level || "Beginner", p.region].filter(Boolean).join(" · "),
                }))}
                className="bg-[#FBF7F1]/10 border-0 rounded-lg px-3 py-2 text-xs text-snow focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
              />
            </div>

            {/* Target group: players added from the search or "Tambah Pemain" go straight into it */}
            {groups.length > 0 && (
              <div className="flex items-center gap-2 min-w-0" role="radiogroup" aria-label="Grup untuk pemain yang ditambahkan">
                <span className="text-2xs text-[#FBF7F1]/60 whitespace-nowrap">Masuk ke</span>
                <div className="flex items-center gap-1.5">
                  {groups.map((g) => {
                    const selected = groupKey(g) === addTargetId;
                    return (
                      <button
                        key={groupKey(g)}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={`${g.name} · Coach ${coachName(g)}`}
                        title={`${g.name} · Coach ${coachName(g)}`}
                        onClick={() => onAddTargetChange(groupKey(g))}
                        className={`w-6 h-6 rounded-full border-0 p-0 cursor-pointer transition-all hover:scale-110 ${
                          selected ? "ring-2 ring-snow ring-offset-2 ring-offset-[#221F30]" : "opacity-50 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: g.color }}
                      />
                    );
                  })}
                </div>
                {addTarget && (
                  <span className="text-2xs font-semibold text-snow truncate">
                    {addTarget.name} · {coachName(addTarget)}
                  </span>
                )}
              </div>
            )}
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

        {/* Batch bar: move or remove the checked players at once */}
        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-xl px-3.5 py-2.5 bg-[#FFD43B]/10 border border-[#FFD43B]/30">
            <span className="text-xs font-bold text-snow whitespace-nowrap">{selected.length} pemain dipilih</span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xs text-[#FBF7F1]/65 whitespace-nowrap">Pindahkan ke</span>
              {groups.map((g) => (
                <button
                  key={groupKey(g)}
                  type="button"
                  onClick={() => moveSelected(groupKey(g))}
                  className="inline-flex items-center gap-1.5 border-0 rounded-full pl-2 pr-2.5 py-1 text-2xs font-bold text-snow cursor-pointer transition-transform hover:scale-[1.03]"
                  style={{ backgroundColor: tint(g.color, 22), boxShadow: `inset 0 0 0 1px ${tint(g.color, 55)}` }}
                >
                  <span aria-hidden className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                  {g.name} · {coachName(g)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={removeSelected}
                className="bg-transparent border-0 p-0 text-2xs text-[#FF5A3C] hover:underline font-bold cursor-pointer"
              >
                Hapus dari sesi
              </button>
              <button
                type="button"
                onClick={() => setPicked([])}
                className="bg-transparent border-0 p-0 text-2xs text-[#FBF7F1]/70 hover:text-snow font-bold cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        )}

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
                    <th className="py-2.5 pl-3.5 pr-0 w-8">
                      <input
                        type="checkbox"
                        aria-label="Pilih semua pemain yang tampil"
                        checked={allShownSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someShownSelected && !allShownSelected;
                        }}
                        onChange={toggleAllShown}
                        className="w-4 h-4 accent-[#FFD43B] cursor-pointer align-middle"
                      />
                    </th>
                    {sortHeader("name", "Pemain")}
                    {sortHeader("level", "Level Saat Ini")}
                    {sortHeader("group", "Ditugaskan ke Grup / Coach")}
                    <th className="py-2.5 px-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FBF7F1]/6">
                  {sortedPlayers.map((player) => {
                    const assignedGroup = groupOf(player.id);
                    const assignedGroupId = assignedGroup ? groupKey(assignedGroup) : "";
                    const color = assignedGroup?.color || "#FBF7F1";
                    const isPicked = selected.includes(player.id);

                    return (
                      <tr
                        key={player.id}
                        className={`transition-colors ${isPicked ? "bg-[#FFD43B]/6" : "hover:bg-[#FBF7F1]/3"}`}
                      >
                        <td className="py-2.5 pl-3.5 pr-0 w-8">
                          <input
                            type="checkbox"
                            aria-label={`Pilih ${player.name}`}
                            checked={isPicked}
                            onChange={() => toggleOne(player.id)}
                            className="w-4 h-4 accent-[#FFD43B] cursor-pointer align-middle"
                          />
                        </td>
                        <td className="py-2.5 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={player.name} photoUrl={player.photo_url} size={30} />
                            <span className="font-semibold text-snow">{player.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 text-xs text-[#FBF7F1]/75">
                          {player.level || "Beginner"}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <div className="relative inline-flex items-center">
                            <span
                              aria-hidden
                              className="absolute left-2.5 w-2.5 h-2.5 rounded-full pointer-events-none"
                              style={{ backgroundColor: color }}
                            />
                            <select
                              value={assignedGroupId}
                              onChange={(e) => onAssignPlayerGroup([player.id], e.target.value)}
                              className="border-0 rounded-lg pl-7 pr-2.5 py-1.5 text-xs font-semibold text-snow appearance-auto cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
                              style={{ backgroundColor: tint(color, 22), boxShadow: `inset 0 0 0 1px ${tint(color, 55)}` }}
                            >
                              {groups.map((g) => (
                                <option key={groupKey(g)} value={groupKey(g)} className="bg-[#17151F]">
                                  {g.name} · Coach {coachName(g)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => onRemovePlayers([player.id])}
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
    </>
  );
}
