"use client";

import { useEffect, useState } from "react";
import type { SkillBoard, SkillKind } from "@/lib/coachingRules";
import { BOARD_TITLE, INGAME_NOTE, SkillBoardCard, SkillRow } from "./SkillBoardCard";

export const SCORE_LEGEND = "1 Belum bisa · 2 Mulai bisa · 3 Lumayan · 4 Bagus · 5 Mantap · ▲ naik dari sesi sebelumnya";
const ALL_LABEL: Record<SkillKind, string> = { teknik: "teknik", ingame: "aspek" };

/** Rated skills per category, "+N belum dinilai" under them, untouched categories as chips at the end. */
function CompactBoard({ board }: { board: SkillBoard }) {
  const rated = board.groups.filter((g) => g.items.some((i) => i.score !== null));
  const untouched = board.groups.filter((g) => g.items.every((i) => i.score === null));
  return (
    <div>
      {board.kind === "ingame" && <p className="m-0 mb-1 text-caption text-ink/60 leading-copy">{INGAME_NOTE}</p>}
      {rated.map((g) => {
        const unrated = g.items.filter((i) => i.score === null).length;
        return (
          <div key={g.label}>
            <div className="text-2xs font-bold tracking-[0.1em] uppercase text-ink/55 pt-3.5 pb-1">{g.label}</div>
            {g.items.filter((i) => i.score !== null).map((item) => (
              <SkillRow key={item.key} item={item} />
            ))}
            {unrated > 0 && <div className="text-xs text-ink/50 pt-1.5 pb-0.5 border-t border-ink/7">+{unrated} belum dinilai</div>}
          </div>
        );
      })}
      {untouched.length > 0 && (
        <div className="pt-3.5">
          <div className="text-2xs font-bold tracking-[0.1em] uppercase text-ink/55 pb-2">
            {rated.length ? "Belum dinilai sama sekali" : "Belum ada yang dinilai"}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {untouched.map((g) => (
              <span key={g.label} className="rounded-full px-2.5 py-1 bg-ink/5 text-xs font-semibold text-ink/65 whitespace-nowrap">
                {g.label} · {g.items.length}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Full list of one board in a dialog; Esc or the backdrop closes it. */
function AllSkillsDialog({ board, onClose }: { board: SkillBoard; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-end md:items-center justify-center md:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Semua ${ALL_LABEL[board.kind]}`}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full md:max-w-160 max-h-[88vh] overflow-y-auto rounded-t-2xl md:rounded-2xl p-5 md:p-6 shadow-2xl"
      >
        <div className="flex justify-end -mt-2 -mr-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-11 h-11 inline-flex items-center justify-center bg-transparent border-none text-ink/60 hover:text-ink cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
        <SkillBoardCard board={board} footnote={SCORE_LEGEND} plain />
      </div>
    </div>
  );
}

/** D.2: Teknik / In-game in one card, only rated skills up front, everything behind "Lihat semua". */
export function SkillBoards({ boards }: { boards: SkillBoard[] }) {
  const [kind, setKind] = useState<SkillKind>("teknik");
  const [open, setOpen] = useState(false);
  const board = boards.find((b) => b.kind === kind) ?? boards[0];
  if (!board) return null;

  return (
    <section className="bg-white border border-ink/8 rounded-2xl p-5 md:p-6 text-ink flex flex-col">
      <div role="tablist" aria-label="Kategori penilaian" className="flex gap-1 p-1 rounded-full bg-ink/6 mb-1.5">
        {boards.map((b) => (
          <button
            key={b.kind}
            type="button"
            role="tab"
            aria-selected={b.kind === kind}
            onClick={() => setKind(b.kind)}
            className={`flex-1 border-none rounded-full min-h-10 px-3 font-sans font-bold text-sm inline-flex items-center justify-center gap-1.5 cursor-pointer ${
              b.kind === kind ? "bg-indigo text-snow" : "bg-transparent text-ink/70 hover:text-ink"
            }`}
          >
            {BOARD_TITLE[b.kind]}
            <span className={`font-semibold text-xs ${b.kind === kind ? "text-snow/70" : "text-ink/50"}`}>
              {b.rated} dari {b.total}
            </span>
          </button>
        ))}
      </div>

      <div role="tabpanel">
        <CompactBoard board={board} />
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start mt-3 border-[1.5px] border-ink/18 bg-white rounded-full min-h-10 px-4 font-sans font-bold text-caption text-indigo cursor-pointer hover:border-indigo"
      >
        Lihat semua {board.total} {ALL_LABEL[board.kind]} →
      </button>
      <p className="m-0 mt-3 text-xs text-ink/55 leading-copy">{SCORE_LEGEND}</p>

      {open && <AllSkillsDialog board={board} onClose={() => setOpen(false)} />}
    </section>
  );
}
