import { useMemo } from "react";
import type { CoachingSkill } from "@/lib/database.types";

export function SessionSkillsSelector({
  skills,
  selectedSkillIds,
  onToggleSkill,
  onSelectPopular,
  onSelectAll,
  onClear,
}: {
  skills: CoachingSkill[];
  selectedSkillIds: string[];
  onToggleSkill: (id: string) => void;
  onSelectPopular: () => void;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  const techniqueCategories = useMemo(() => {
    const map = new Map<string, CoachingSkill[]>();
    skills
      .filter((s) => s.type === "teknik")
      .forEach((s) => {
        if (!map.has(s.category)) map.set(s.category, []);
        map.get(s.category)!.push(s);
      });
    return Array.from(map.entries());
  }, [skills]);

  const ingameCategories = useMemo(() => {
    const map = new Map<string, CoachingSkill[]>();
    skills
      .filter((s) => s.type === "in_game")
      .forEach((s) => {
        if (!map.has(s.category)) map.set(s.category, []);
        map.get(s.category)!.push(s);
      });
    return Array.from(map.entries());
  }, [skills]);
  return (
    <div className="bg-[#221F30] rounded-2xl p-5 lg:p-6 border border-[#FBF7F1]/5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#FBF7F1]/10 pb-2">
        <div>
          <h2 className="font-display font-bold text-lg m-0 text-snow">
            4. Pilih Teknik Default Sesi Ini
          </h2>
          <p className="text-2xs text-[#FBF7F1]/65 m-0 mt-0.5">
            Teknik yang dipilih di sini akan otomatis muncul aktif saat coach menilai pemain di sesi ini.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onSelectPopular}
            className="border-0 rounded-lg px-3 py-1.5 font-bold text-2xs bg-[#FBF7F1]/10 text-[#FBF7F1] hover:bg-[#FBF7F1]/15 transition-all cursor-pointer"
          >
            Pilih 8 Populer
          </button>
          <button
            type="button"
            onClick={onSelectAll}
            className="border-0 rounded-lg px-3 py-1.5 font-bold text-2xs bg-[#FBF7F1]/10 text-[#FBF7F1] hover:bg-[#FBF7F1]/15 transition-all cursor-pointer"
          >
            Pilih Semua ({skills.length})
          </button>
          <button
            type="button"
            onClick={onClear}
            className="border-0 rounded-lg px-3 py-1.5 font-bold text-2xs bg-transparent text-[#FF5A3C] hover:bg-[#FF5A3C]/10 transition-all cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Chip Selection Card */}
      <div className="bg-[#1F1C2B] rounded-xl p-4 lg:p-5 border border-[#FBF7F1]/5 flex flex-col gap-2.5">
        <div className="flex justify-between items-baseline gap-2 flex-wrap">
          <span className="font-bold text-sm text-[#FBF7F1]">Pilih yang dinilai sesi ini</span>
          <span className="text-xs text-[#FBF7F1]/60">
            {selectedSkillIds.length} dari {skills.length} dipilih
          </span>
        </div>

        {/* TEKNIK Category Chips */}
        <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#FFD43B] pt-2 pb-0.5 block">
          Teknik
        </span>

        <div className="flex flex-col divide-y divide-[#FBF7F1]/6">
          {techniqueCategories.map(([categoryName, skillsInCat]) => (
            <div
              key={categoryName}
              className="flex flex-col lg:flex-row lg:items-start gap-2 lg:gap-3 py-2"
            >
              <span className="flex-none lg:w-[140px] text-xs text-[#FBF7F1]/60 lg:pt-2">
                {categoryName}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {skillsInCat.map((skill) => {
                  const isChosen = selectedSkillIds.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      aria-pressed={isChosen}
                      onClick={() => onToggleSkill(skill.id)}
                      className={`rounded-full min-h-9 px-3 py-1.5 font-sans text-[13px] font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                        isChosen
                          ? "border-[#FFD43B] bg-[#FFD43B]/14 text-[#FFD43B]"
                          : "border-[#FBF7F1]/18 bg-transparent text-[#FBF7F1]/85 hover:border-[#FBF7F1]/35"
                      }`}
                    >
                      {isChosen ? `✓ ${skill.name}` : `+ ${skill.name}`}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* IN-GAME Category Chips */}
        <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#FFD43B] pt-3 pb-0.5 block">
          In-game
        </span>

        <div className="flex flex-col divide-y divide-[#FBF7F1]/6">
          {ingameCategories.map(([categoryName, skillsInCat]) => (
            <div
              key={categoryName}
              className="flex flex-col lg:flex-row lg:items-start gap-2 lg:gap-3 py-2"
            >
              <span className="flex-none lg:w-[140px] text-xs text-[#FBF7F1]/60 lg:pt-2">
                {categoryName}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {skillsInCat.map((skill) => {
                  const isChosen = selectedSkillIds.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      aria-pressed={isChosen}
                      onClick={() => onToggleSkill(skill.id)}
                      className={`rounded-full min-h-9 px-3 py-1.5 font-sans text-[13px] font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                        isChosen
                          ? "border-[#FFD43B] bg-[#FFD43B]/14 text-[#FFD43B]"
                          : "border-[#FBF7F1]/18 bg-transparent text-[#FBF7F1]/85 hover:border-[#FBF7F1]/35"
                      }`}
                    >
                      {isChosen ? `✓ ${skill.name}` : `+ ${skill.name}`}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
