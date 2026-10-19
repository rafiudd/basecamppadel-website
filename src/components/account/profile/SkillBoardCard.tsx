import type { SkillBoard, SkillScore } from "@/lib/coachingRules";

export const BOARD_TITLE = { teknik: "Teknik", ingame: "In-game" } as const;
export const INGAME_NOTE = "Non-teknik: taktik, kerja sama, mental & fisik. Dinilai coach waktu kamu main.";

/** Five segments; a .5 score fills half of the last one. */
function ScoreBar({ score }: { score: number | null }) {
  return (
    <span className="grid grid-cols-5 gap-0.5" role={score === null ? undefined : "img"} aria-hidden={score === null || undefined} aria-label={score === null ? undefined : `${score} dari 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        if (score === null) return <span key={i} className="h-2.5 rounded-[3px] border border-dashed border-ink/18 box-border" />;
        const fill = Math.max(0, Math.min(1, score - (i - 1)));
        return (
          <span
            key={i}
            className="h-2.5 rounded-[3px]"
            style={{ background: fill >= 1 ? "var(--color-indigo)" : fill > 0 ? "linear-gradient(90deg, var(--color-indigo) 50%, #ECEAF3 50%)" : "#ECEAF3" }}
          />
        );
      })}
    </span>
  );
}

export function SkillRow({ item }: { item: SkillScore }) {
  const rated = item.score !== null;
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_4.5rem] md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_5rem] items-center gap-3 py-2 border-t border-ink/7">
      <span className={`font-semibold text-sm leading-label ${rated ? "" : "text-ink/50"}`}>{item.label}</span>
      <ScoreBar score={item.score} />
      {rated ? (
        <span className="flex items-baseline justify-end gap-1.5">
          <span className="font-display font-bold text-base text-indigo">{item.score}</span>
          {item.delta !== null && item.delta > 0 ? (
            <span className="text-xs font-bold text-[#23794A] whitespace-nowrap" title={`Naik ${item.delta} dari sesi sebelumnya`}>
              ▲ {item.delta}
            </span>
          ) : (
            <span className="text-xs text-ink/40 w-9 text-right" aria-hidden>–</span>
          )}
        </span>
      ) : (
        <span className="text-xs text-ink/50 text-right">belum dinilai</span>
      )}
    </div>
  );
}

/**
 * D.2: every skill of one kind, grouped by category; unrated skills stay grey. `plain` drops the card
 * frame (inside the "Lihat semua" dialog).
 */
export function SkillBoardCard({ board, footnote, plain }: { board: SkillBoard; footnote?: string; plain?: boolean }) {
  return (
    <section className={`text-ink ${plain ? "" : "bg-white border border-ink/8 rounded-2xl p-5 md:p-6"}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display font-bold text-xl m-0">{BOARD_TITLE[board.kind]}</h2>
        <span className="text-caption text-ink/60">
          {board.rated} dari {board.total} udah dinilai
        </span>
      </div>
      {board.kind === "ingame" && (
        <p className="m-0 mt-1 text-caption text-ink/60 leading-copy">{INGAME_NOTE}</p>
      )}
      {board.groups.map((g) => (
        <div key={g.label}>
          <div className="text-2xs font-bold tracking-[0.1em] uppercase text-ink/55 pt-3.5 pb-1">{g.label}</div>
          {g.items.map((item) => (
            <SkillRow key={item.key} item={item} />
          ))}
        </div>
      ))}
      {footnote && <p className="m-0 mt-3 text-xs text-ink/55 leading-copy">{footnote}</p>}
    </section>
  );
}
