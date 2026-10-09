"use client";

import type { CoachingSkill } from "@/lib/database.types";
import { computeScoreDelta } from "@/lib/coaching";

export function ScoringRow({
  skill,
  currentScore,
  prevScore,
  onScoreClick,
}: {
  skill: CoachingSkill;
  currentScore?: number;
  prevScore?: number;
  onScoreClick: (skillId: string, val: number) => void;
}) {
  const delta = computeScoreDelta(currentScore, prevScore);

  return (
    <div className="py-2.5">
      {/* Desktop row view (hidden on mobile) */}
      <div className="hidden lg:flex items-center gap-3">
        <div className="w-[130px] flex-none font-semibold text-sm flex items-center gap-2">
          <span>{skill.name}</span>
          {delta.formatted && (
            <span
              title={`Sesi sebelumnya: ${prevScore}`}
              className={`text-[11px] font-bold px-1 rounded ${
                delta.delta && delta.delta > 0
                  ? "text-[#6FD39A]"
                  : delta.delta && delta.delta < 0
                  ? "text-[#FF5A3C]"
                  : "text-[#FBF7F1]/50"
              }`}
            >
              {delta.formatted}
            </span>
          )}
        </div>

        <div
          role="group"
          aria-label={`Nilai ${skill.name}`}
          className="flex gap-1 flex-wrap"
        >
          {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((val) => {
            const isValSelected = currentScore === val;
            return (
              <button
                key={val}
                type="button"
                aria-pressed={isValSelected}
                onClick={() => onScoreClick(skill.id, val)}
                className={`w-11 h-10 rounded-lg font-sans font-bold text-sm p-0 transition-all cursor-pointer ${
                  isValSelected
                    ? "border border-[#FFD43B] bg-[#FFD43B] text-[#17151F]"
                    : "border border-[#FBF7F1]/15 bg-transparent text-[#FBF7F1] hover:bg-[#FBF7F1]/5"
                }`}
              >
                {val}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile row view (1-5 with +0.5 toggle) */}
      <div className="flex lg:hidden flex-col gap-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{skill.name}</span>
            {delta.formatted && (
              <span
                className={`text-[11px] font-bold ${
                  delta.delta && delta.delta > 0
                    ? "text-[#6FD39A]"
                    : delta.delta && delta.delta < 0
                    ? "text-[#FF5A3C]"
                    : "text-[#FBF7F1]/50"
                }`}
              >
                {delta.formatted}
              </span>
            )}
          </div>
          <label className="flex items-center gap-1.5 text-xs text-[#FBF7F1]/75 cursor-pointer">
            <input
              type="checkbox"
              checked={currentScore ? currentScore % 1 !== 0 : false}
              onChange={(e) => {
                if (!currentScore) {
                  onScoreClick(skill.id, 1.5);
                } else {
                  const base = Math.floor(currentScore);
                  onScoreClick(
                    skill.id,
                    e.target.checked ? base + 0.5 : base
                  );
                }
              }}
              className="accent-[#FFD43B] rounded"
            />
            <span>+0.5</span>
          </label>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map((num) => {
            const hasHalf = currentScore ? currentScore % 1 !== 0 : false;
            const targetVal = hasHalf ? num + 0.5 : num;
            const isSelected = currentScore === num || currentScore === num + 0.5;

            return (
              <button
                key={num}
                type="button"
                onClick={() => onScoreClick(skill.id, targetVal)}
                className={`h-11 rounded-lg font-sans font-bold text-sm transition-all cursor-pointer ${
                  isSelected
                    ? "border border-[#FFD43B] bg-[#FFD43B] text-[#17151F]"
                    : "border border-[#FBF7F1]/15 bg-transparent text-[#FBF7F1]"
                }`}
              >
                {isSelected ? currentScore : num}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
