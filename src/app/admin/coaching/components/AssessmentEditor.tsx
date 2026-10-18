"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { toast } from "@/components/ui/Toast";
import { initials } from "@/lib/format";
import type { CoachingSkill } from "@/lib/database.types";
import { LEVEL_DEFINITIONS, type computePlayerLevel } from "@/lib/coaching";
import type { SessionPlayerItem } from "@/lib/coaching-db";
import { generateCoachNote } from "../ai-actions";
import { ScoringRow } from "./ScoringRow";

export function AssessmentEditor({
  currentPlayerItem,
  currentComputedLevel,
  scores,
  activeSkillIds,
  allSkills,
  chosenTeknikSkills,
  chosenIngameSkills,
  techniqueCategories,
  ingameCategories,
  evaluation,
  nextPractice,
  publishedToPlayer,
  saveStatus,
  isPending,
  busyAction,
  isAdmin,
  onScoreClick,
  onToggleSkillChip,
  onEvaluationChange,
  onNextPracticeChange,
  onGenerated,
  onPublishedChange,
  onSaveDraft,
  onSubmitAndNext,
  onOpenOverrideModal,
}: {
  currentPlayerItem: SessionPlayerItem | null;
  currentComputedLevel: ReturnType<typeof computePlayerLevel>;
  scores: Record<string, number>;
  activeSkillIds: string[] | string[];
  allSkills: CoachingSkill[];
  chosenTeknikSkills: CoachingSkill[];
  chosenIngameSkills: CoachingSkill[];
  techniqueCategories: [string, CoachingSkill[]][];
  ingameCategories: [string, CoachingSkill[]][];
  evaluation: string;
  nextPractice: string;
  publishedToPlayer: boolean;
  saveStatus: string;
  isPending: boolean;
  busyAction: "draft" | "submit" | null;
  isAdmin: boolean;
  onScoreClick: (skillId: string, val: number) => void;
  onToggleSkillChip: (skillId: string) => void;
  onEvaluationChange: (val: string) => void;
  onNextPracticeChange: (val: string) => void;
  /** Sets evaluation + nextPractice together as one atomic update/save (see handleGenerate). */
  onGenerated: (evaluation: string, nextPractice: string) => void;
  onPublishedChange: (val: boolean) => void;
  onSaveDraft: () => void;
  onSubmitAndNext: () => void;
  onOpenOverrideModal: () => void;
}) {
  const [generating, setGenerating] = useState(false);

  if (!currentPlayerItem) {
    return (
      <div className="bg-[#221F30] rounded-2xl p-12 text-center text-[#FBF7F1]/60 border border-[#FBF7F1]/5">
        Pilih atau buat sesi coaching terlebih dahulu.
      </div>
    );
  }

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const ratings = [...chosenTeknikSkills, ...chosenIngameSkills]
        .filter((s) => scores[s.id] > 0)
        .map((s) => ({ label: s.name, category: s.category, score: scores[s.id] }));
      const res = await generateCoachNote({
        playerName: currentPlayerItem.player.name,
        gender: currentPlayerItem.player.gender,
        level: currentComputedLevel.level,
        ratings,
        existingEvaluation: evaluation,
        existingNextPractice: nextPractice,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      onGenerated(res.evaluation || evaluation, res.nextPractice || nextPractice);
      toast.success("Draft AI diisi — cek & edit dulu sebelum disimpan");
    } catch {
      toast.error("Gagal generate. Coba lagi.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <div className="bg-[#221F30] rounded-2xl p-5 lg:p-6 flex flex-col gap-5 border border-[#FBF7F1]/5">
        {/* Player Header Card */}
        <div className="flex items-center gap-3.5 pb-2">
          {currentPlayerItem.player.photo_url ? (
            // photo with a ring in the level color, so the level stays visible
            <span
              className="rounded-full p-[3px] flex-none"
              style={{ backgroundColor: LEVEL_DEFINITIONS[currentComputedLevel.level]?.color || "#FFD43B" }}
            >
              <Avatar name={currentPlayerItem.player.name} photoUrl={currentPlayerItem.player.photo_url} size={42} />
            </span>
          ) : (
            <span
              aria-hidden="true"
              className="w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-base flex-none"
              style={{
                backgroundColor: LEVEL_DEFINITIONS[currentComputedLevel.level]?.color || "#FFD43B",
                color: LEVEL_DEFINITIONS[currentComputedLevel.level]?.textColor || "#17151F",
              }}
            >
              {initials(currentPlayerItem.player.name)}
            </span>
          )}

          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-display font-bold text-xl lg:text-[22px] m-0 text-[#FBF7F1]">
                {currentPlayerItem.player.name}
              </h2>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
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
                  : "Belum dinilai"}
              </span>
            </div>
            <div className="text-[13px] text-[#FBF7F1]/70 mt-1 flex items-center gap-2 flex-wrap">
              <span>
                {currentPlayerItem.group?.name || "Grup 1"} · {currentPlayerItem.player.gender === "F" ? "Women" : "Men"} · {currentComputedLevel.level}
              </span>
              {currentComputedLevel.isOverridden && (
                <span className="text-3xs text-[#FF5A3C] bg-[#FF5A3C]/10 px-1.5 py-0.5 rounded font-bold">
                  Override
                </span>
              )}
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-2 flex-none">
            {isAdmin && (
              <button
                type="button"
                onClick={onOpenOverrideModal}
                className="hidden sm:inline-flex text-xs bg-[#FBF7F1]/10 hover:bg-[#FBF7F1]/15 text-[#FBF7F1]/90 px-3 py-1.5 rounded-lg border border-[#FBF7F1]/10 font-medium cursor-pointer"
              >
                Ubah Level
              </button>
            )}
            {currentPlayerItem.status === "submitted" && currentPlayerItem.assessment && (
              <Link
                href={`/admin/coaching/rapor/${currentPlayerItem.assessment.id}`}
                target="_blank"
                className="text-sm text-[#FBF7F1]/80 hover:text-[#FFD43B] no-underline"
              >
                Lihat rapor ↗
              </Link>
            )}
            <Link
              href={`/leaderboard/${currentPlayerItem.player.id}`}
              className="text-sm text-[#FBF7F1]/80 hover:text-[#FFD43B] no-underline"
            >
              Lihat profil ↗
            </Link>
          </div>
        </div>

        {/* Nilai Teknik & In-game Section */}
        <div className="flex flex-col gap-4">
          <div>
            <span className="text-[12px] tracking-[0.08em] text-[#FBF7F1]/70 uppercase mb-2 block font-medium">
              Nilai teknik &amp; in-game
            </span>

            {/* Subcategory: TEKNIK */}
            {chosenTeknikSkills.length > 0 && (
              <div className="flex flex-col">
                <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#FFD43B] pt-3.5 pb-1 block">
                  Teknik
                </span>

                <div className="flex flex-col divide-y divide-[#FBF7F1]/8">
                  {chosenTeknikSkills.map((skill) => (
                    <ScoringRow
                      key={skill.id}
                      skill={skill}
                      currentScore={scores[skill.id]}
                      prevScore={currentPlayerItem.previousScores[skill.id]}
                      onScoreClick={onScoreClick}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Subcategory: IN-GAME */}
            {chosenIngameSkills.length > 0 && (
              <div className="flex flex-col mt-2">
                <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#FFD43B] pt-3.5 pb-1 block">
                  In-game
                </span>

                <div className="flex flex-col divide-y divide-[#FBF7F1]/8">
                  {chosenIngameSkills.map((skill) => (
                    <ScoringRow
                      key={skill.id}
                      skill={skill}
                      currentScore={scores[skill.id]}
                      prevScore={currentPlayerItem.previousScores[skill.id]}
                      onScoreClick={onScoreClick}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CHIP SELECTOR: PILIH YANG DINILAI SESI INI */}
          <div className="bg-[#1F1C2B] rounded-xl p-4 lg:p-4.5 border border-[#FBF7F1]/5 flex flex-col gap-2.5 mt-2">
            <div className="flex justify-between items-baseline gap-2 flex-wrap">
              <span className="font-bold text-sm text-[#FBF7F1]">Pilih yang dinilai sesi ini</span>
              <span className="text-xs text-[#FBF7F1]/60">
                {activeSkillIds.length} dari {allSkills.length} dipilih
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
                      const isChosen = activeSkillIds.includes(skill.id);
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          aria-pressed={isChosen}
                          onClick={() => onToggleSkillChip(skill.id)}
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
                      const isChosen = activeSkillIds.includes(skill.id);
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          aria-pressed={isChosen}
                          onClick={() => onToggleSkillChip(skill.id)}
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

          {/* EVALUATION, NEXT PRACTICE & CHECKBOX */}
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                data-loading={generating || undefined}
                className="border-0 rounded-lg min-h-9 px-3.5 font-sans font-bold text-xs whitespace-nowrap inline-flex items-center justify-center gap-1.5 bg-[#FFD43B]/14 text-[#FFD43B] hover:bg-[#FFD43B]/22 transition-all disabled:opacity-50 cursor-pointer"
              >
                ✨ {generating ? "Lagi nulis…" : "Generate dengan AI"}
              </button>
            </div>
            <label className="block">
              <span className="text-[12px] tracking-[0.08em] text-[#FBF7F1]/70 uppercase mb-2 block font-medium">
                Evaluasi (apa yang udah bagus &amp; yang perlu dibenerin)
              </span>
              <textarea
                rows={4}
                value={evaluation}
                onChange={(e) => onEvaluationChange(e.target.value)}
                placeholder="- Forehand udah stabil dan bisa diarahkan..."
                className="bg-[#FBF7F1]/10 border-0 rounded-lg p-3 font-sans text-[15px] leading-normal text-[#FBF7F1] w-full box-border resize-vertical focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
              />
            </label>

            <label className="block">
              <span className="text-[12px] tracking-[0.08em] text-[#FBF7F1]/70 uppercase mb-2 block font-medium">
                Latihan berikutnya
              </span>
              <textarea
                rows={3}
                value={nextPractice}
                onChange={(e) => onNextPracticeChange(e.target.value)}
                placeholder="- Saat defend, mundur sampai dekat kaca belakang..."
                className="bg-[#FBF7F1]/10 border-0 rounded-lg p-3 font-sans text-[15px] leading-normal text-[#FBF7F1] w-full box-border resize-vertical focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
              />
            </label>

            <label className="flex items-start gap-2.5 text-sm leading-snug min-h-11 cursor-pointer">
              <input
                type="checkbox"
                checked={publishedToPlayer}
                onChange={(e) => onPublishedChange(e.target.checked)}
                className="w-5 h-5 accent-[#FFD43B] flex-none mt-0.5"
              />
              <span>
                <b>Tampilkan ke pemain</b>
                <br />
                <span className="text-[#FBF7F1]/70 text-xs">
                  Muncul di Profil › Catatan coach dan bisa diunduh jadi rapor PDF.
                </span>
              </span>
            </label>
          </div>

          {/* DESKTOP FOOTER ACTION BAR */}
          <div className="hidden lg:flex justify-between items-center gap-3 border-t border-[#FBF7F1]/10 pt-4.5 mt-2">
            <span className="text-[13px] text-[#FBF7F1]/65">
              {saveStatus}
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={isPending}
                data-loading={busyAction === "draft" || undefined}
                className="border-0 rounded-lg min-h-11 px-4.5 font-sans font-bold text-sm whitespace-nowrap inline-flex items-center justify-center gap-2 bg-[#FBF7F1]/12 text-[#FBF7F1] hover:bg-[#FBF7F1]/18 transition-all disabled:opacity-50 cursor-pointer"
              >
                Simpan draft
              </button>
              <button
                type="button"
                onClick={onSubmitAndNext}
                disabled={isPending}
                data-loading={busyAction === "submit" || undefined}
                className="border-0 rounded-lg min-h-11 px-4.5 font-sans font-bold text-sm whitespace-nowrap inline-flex items-center justify-center gap-2 bg-[#FF5A3C] text-[#17151F] hover:bg-[#FF5A3C]/90 transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                Simpan &amp; kirim · lanjut pemain berikutnya →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE FLOATING STICKY ACTION BAR */}
      <div className="fixed lg:hidden left-0 right-0 bottom-16 bg-[#17151F] border-t border-[#FBF7F1]/10 p-3 px-4 flex gap-2 z-30">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isPending}
          data-loading={busyAction === "draft" || undefined}
          className="border-0 rounded-lg min-h-11 px-4 font-sans font-bold text-sm whitespace-nowrap inline-flex items-center justify-center gap-2 bg-[#FBF7F1]/12 text-[#FBF7F1] disabled:opacity-50 cursor-pointer"
        >
          Draft
        </button>
        <button
          type="button"
          onClick={onSubmitAndNext}
          disabled={isPending}
          data-loading={busyAction === "submit" || undefined}
          className="border-0 rounded-lg min-h-11 px-4 font-sans font-bold text-sm whitespace-nowrap inline-flex items-center justify-center gap-2 flex-grow bg-[#FF5A3C] text-[#17151F] disabled:opacity-50 shadow-md cursor-pointer"
        >
          Simpan &amp; lanjut →
        </button>
      </div>
    </>
  );
}
