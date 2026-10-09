"use client";

import type { Coach } from "@/lib/database.types";

export interface FormGroupItem {
  id?: string;
  tempId: string;
  name: string;
  color: string;
  coachId: string;
}

export function SessionGroupsEditor({
  groups,
  coaches,
  sessionPlayerIds,
  playerGroupMap,
  colorPresets,
  onAddGroup,
  onRemoveGroup,
  onUpdateGroup,
}: {
  groups: FormGroupItem[];
  coaches: Coach[];
  sessionPlayerIds: string[];
  playerGroupMap: Record<string, string>;
  colorPresets: string[];
  onAddGroup: () => void;
  onRemoveGroup: (idx: number) => void;
  onUpdateGroup: (idx: number, patch: Partial<FormGroupItem>) => void;
}) {
  return (
    <div className="bg-[#221F30] rounded-2xl p-5 lg:p-6 border border-[#FBF7F1]/5 flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-[#FBF7F1]/10 pb-2">
        <div>
          <h2 className="font-display font-bold text-lg m-0 text-snow">
            2. Grup Coaching &amp; Penugasan Coach
          </h2>
          <p className="text-2xs text-[#FBF7F1]/65 m-0 mt-0.5">
            Setiap grup memiliki nama, warna pengenal, dan coach yang memimpin penilaian.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddGroup}
          className="border-0 rounded-lg px-3.5 py-2 font-bold text-xs bg-[#FFD43B] text-[#17151F] hover:bg-[#FFD43B]/90 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <span>+</span> Tambah Grup
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {groups.map((grp, idx) => {
          const groupKey = grp.id || grp.tempId;
          const playerCount = sessionPlayerIds.filter((pid) => playerGroupMap[pid] === groupKey).length;

          return (
            <div
              key={groupKey}
              className="bg-[#1F1C2B] rounded-xl p-4 border border-[#FBF7F1]/10 flex flex-col gap-3 relative"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-none shadow-xs"
                    style={{ backgroundColor: grp.color }}
                  />
                  <span className="font-bold text-sm text-snow">{grp.name}</span>
                  <span className="text-2xs bg-[#FBF7F1]/10 px-2 py-0.5 rounded-full text-[#FBF7F1]/70">
                    {playerCount} pemain
                  </span>
                </div>

                {groups.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveGroup(idx)}
                    className="text-2xs text-[#FF5A3C] hover:text-[#FF5A3C]/80 cursor-pointer"
                  >
                    Hapus
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <label className="block">
                  <span className="text-3xs uppercase tracking-wider text-[#FBF7F1]/60 block mb-1 font-semibold">
                    Nama Grup
                  </span>
                  <input
                    type="text"
                    required
                    value={grp.name}
                    onChange={(e) => onUpdateGroup(idx, { name: e.target.value })}
                    className="w-full bg-[#FBF7F1]/10 border-0 rounded-lg px-2.5 py-2 text-xs text-snow focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
                  />
                </label>

                <label className="block">
                  <span className="text-3xs uppercase tracking-wider text-[#FBF7F1]/60 block mb-1 font-semibold">
                    Coach Penanggung Jawab
                  </span>
                  <select
                    value={grp.coachId}
                    onChange={(e) => onUpdateGroup(idx, { coachId: e.target.value })}
                    className="w-full bg-[#FBF7F1]/10 border-0 rounded-lg px-2.5 py-2 text-xs text-snow appearance-auto focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
                  >
                    {coaches.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#17151F]">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Color Presets */}
              <div>
                <span className="text-3xs uppercase tracking-wider text-[#FBF7F1]/60 block mb-1.5 font-semibold">
                  Warna Grup
                </span>
                <div className="flex items-center gap-2">
                  {colorPresets.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => onUpdateGroup(idx, { color: col })}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                        grp.color === col ? "scale-125 ring-2 ring-[#FBF7F1]" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
