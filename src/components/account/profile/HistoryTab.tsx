import Link from "next/link";
import { matchHistory, type EventEntry, type EventKind, type NextSession } from "@/lib/coachingRules";
import { NextSessionCard } from "./SideCards";
import { FINAL_STAGE_LABEL, type FinalStage } from "@/lib/competition";
import { formatDayMonthYear, formatPointsDelta, winRate } from "@/lib/format";
import { primaryButton } from "@/components/account/styles";

const card = "bg-white border border-ink/8 rounded-2xl p-5 md:p-6 flex flex-col text-ink";
const row = "flex items-center gap-3 py-3 border-t border-ink/7";

const KIND: Record<Exclude<EventKind, null>, { label: string; className: string }> = {
  coaching: { label: "Coaching", className: "bg-win/14 text-[#23794A]" },
  kompetisi: { label: "Kompetisi", className: "bg-coral/14 text-[#B8321A]" },
  mabar: { label: "Mabar", className: "bg-indigo/8 text-indigo" },
};

const shortDate = (iso: string) => formatDayMonthYear(iso).replace(/ \d{4}$/, "");

/** "Grup B · 2 menang", "Peringkat 2", "Rapor tersedia", … */
function detail(e: EventEntry): string {
  if (e.kind === "coaching") return "Rapor tersedia";
  const won = e.wins ? `${e.wins} menang` : "";
  if (e.award?.stage === "mabar") return e.award.rank ? `Peringkat ${e.award.rank}` : "Ikut serta";
  if (e.award?.stage === "group") return [e.matches.find((m) => m.section)?.section ?? "Fase grup", won].filter(Boolean).join(" · ");
  if (e.award) return [FINAL_STAGE_LABEL[e.award.stage as FinalStage] ?? e.award.stage, won].filter(Boolean).join(" · ");
  return [won, e.losses ? `${e.losses} kalah` : ""].filter(Boolean).join(" · ") || "Ikut serta";
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-ink/8 rounded-card px-4 py-3.5 min-w-0">
      <div className="text-2xs text-ink/60 uppercase tracking-tag truncate">{label}</div>
      <div className="font-display font-bold text-2xl text-indigo mt-1">{value}</div>
      {sub && <div className="text-xs text-ink/55 mt-0.5">{sub}</div>}
    </div>
  );
}

/**
 * D.5 (per the "Riwayat event" design): totals, every event (coaching sessions included, with their
 * rapor), and every match. Points and W–L are the leaderboard's numbers (players.points / wins / losses).
 */
export function HistoryTab({
  entries,
  points,
  wins,
  losses,
  coachingSessions,
  nextSession,
  basePath = "/akun",
}: {
  entries: EventEntry[];
  points: number;
  wins: number;
  losses: number;
  coachingSessions: number;
  nextSession?: NextSession | null;
  basePath?: string;
}) {
  const matches = matchHistory(entries);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <Stat label="Event diikuti" value={entries.length} />
        <Stat label="Total poin" value={points} />
        <Stat label="Sesi coaching" value={coachingSessions} />
        <Stat label="Match W–L" value={`${wins}–${losses}`} sub={wins + losses ? `${winRate(wins, losses)}% menang` : undefined} />
      </div>

      {entries.length === 0 ? (
        <section className={`${card} gap-3 items-start`}>
          <p className="m-0 text-sm text-ink/65">Belum ada event yang tercatat. Ikut mabar atau event pertamamu!</p>
          <Link href="/jadwal" className={primaryButton}>Lihat jadwal</Link>
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5 md:gap-6 items-start">
          <section className={card}>
            <div className="flex items-baseline justify-between gap-3 pb-2.5">
              <h2 className="font-display font-bold text-xl m-0">Semua event</h2>
              <span className="text-caption text-ink/60">Total {points} poin</span>
            </div>
            {entries.map((e) => (
              <div key={e.key} className={row}>
                <div className="flex-none w-13 text-caption font-bold text-ink/60">{shortDate(e.date)}</div>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <span className="font-bold text-input truncate">{e.title}</span>
                  <span className="flex gap-1.5 items-center flex-wrap">
                    {e.kind && <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${KIND[e.kind].className}`}>{KIND[e.kind].label}</span>}
                    <span className="text-caption text-ink/70">{detail(e)}</span>
                  </span>
                </div>
                {e.reportId && (
                  <Link href={`${basePath}?tab=catatan`} className="text-caption font-bold text-indigo no-underline whitespace-nowrap">
                    Lihat rapor →
                  </Link>
                )}
                <div className={`flex-none w-11 text-right font-display font-bold text-base ${e.points > 0 ? "text-win" : "text-ink/40"}`}>
                  {e.points ? formatPointsDelta(e.points) : "–"}
                </div>
              </div>
            ))}
          </section>

          <div className="flex flex-col gap-5">
            <section className={card}>
              <h2 className="font-display font-bold text-xl m-0 pb-2.5">Riwayat match</h2>
              {matches.length === 0 ? (
                <p className={`${row} m-0 text-sm text-ink/60`}>Belum ada match yang tercatat.</p>
              ) : (
                matches.map((m) => (
                  <div key={m.id} className={row}>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="font-bold text-input truncate">{m.label}</span>
                      <span className="text-caption text-ink/70 truncate">
                        {m.partner && `bareng ${m.partner} · `}vs {m.opponent || "—"}
                      </span>
                    </div>
                    {m.score && <div className="flex-none font-display font-bold text-base">{m.score}</div>}
                    <span
                      aria-label={m.result === "W" ? "Menang" : "Kalah"}
                      className={`flex-none w-7 h-7 rounded-lg inline-flex items-center justify-center font-bold text-caption ${
                        m.result === "W" ? "bg-win/14 text-[#23794A]" : "bg-loss/12 text-loss"
                      }`}
                    >
                      {m.result}
                    </span>
                  </div>
                ))
              )}
            </section>
            <NextSessionCard session={nextSession} />
          </div>
        </div>
      )}
    </div>
  );
}
