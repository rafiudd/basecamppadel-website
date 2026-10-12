import Link from "next/link";
import type { EventEntry } from "@/lib/coachingRules";
import { FINAL_STAGE_LABEL } from "@/lib/competition";
import type { FinalStage } from "@/lib/competition";
import { formatDayMonthYear, formatPointsDelta, winRate } from "@/lib/format";
import { primaryButton } from "@/components/account/styles";

const TYPE_LABEL: Record<string, string> = { mabar: "Mabar", kompetisi: "Kompetisi" };

function resultLabel(e: EventEntry): string {
  if (e.award?.stage === "mabar") return e.award.rank ? `Peringkat ${e.award.rank}` : "Ikut serta";
  if (e.award) return FINAL_STAGE_LABEL[e.award.stage as FinalStage] ?? e.award.stage;
  return `${e.wins} menang · ${e.losses} kalah`;
}

/** D.5: totals (same wins/losses as the leaderboard) and each event with its match results. */
export function HistoryTab({ entries, wins, losses }: { entries: EventEntry[]; wins: number; losses: number }) {
  const stats = [
    { label: "Event diikuti", value: entries.length },
    { label: "Match", value: wins + losses },
    { label: "Win rate", value: `${winRate(wins, losses)}%` },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-190">
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-ink/8 rounded-xl px-3 py-3 md:px-4">
            <div className="text-2xs md:text-xs text-ink/60 font-semibold uppercase tracking-tag">{s.label}</div>
            <div className="font-display font-bold text-2xl text-indigo mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>

      {entries.length === 0 ? (
        <section className="bg-white border border-ink/8 rounded-2xl p-5 md:p-6 flex flex-col gap-3 items-start text-ink">
          <p className="m-0 text-sm text-ink/65">Belum ada event yang tercatat. Ikut mabar atau event pertamamu!</p>
          <Link href="/jadwal" className={primaryButton}>Lihat jadwal</Link>
        </section>
      ) : (
        <ul className="list-none m-0 p-0 flex flex-col gap-3">
          {entries.map((e) => (
            <li key={e.key} className="bg-white border border-ink/8 rounded-2xl p-4 md:p-5 text-ink">
              <div className="flex items-start gap-3">
                <div className="w-14 flex-none text-caption font-semibold text-ink/60 pt-0.5">{formatDayMonthYear(e.date).replace(/ \d{4}$/, "")}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-input">{e.title}</span>
                    {e.type && <span className="text-2xs font-bold rounded-full px-2 py-0.5 bg-indigo/10 text-indigo">{TYPE_LABEL[e.type] ?? e.type}</span>}
                  </div>
                  <div className="text-caption text-ink/60 mt-0.5">{resultLabel(e)}</div>
                </div>
                <div className="font-display font-bold text-base flex-none">{formatPointsDelta(e.points)}</div>
              </div>
              {e.matches.length > 0 && (
                <ul className="list-none m-0 mt-3 p-0 flex flex-col divide-y divide-ink/7 border-t border-ink/7">
                  {e.matches.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 py-2.5">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-display font-bold text-xs flex-none ${
                          m.result === "W" ? "bg-win/15 text-[#23794A]" : "bg-loss/12 text-loss"
                        }`}
                        aria-label={m.result === "W" ? "Menang" : "Kalah"}
                      >
                        {m.result}
                      </span>
                      <div className="flex-1 min-w-0 text-sm">
                        <div className="truncate">
                          {m.team && <span className="text-ink/60">{m.team} · </span>}
                          vs <b>{m.opponent || "—"}</b>
                        </div>
                      </div>
                      {m.score && <span className="font-display font-bold text-sm flex-none">{m.score}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
