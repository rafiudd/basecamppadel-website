import type { CoachReport } from "@/lib/coachingRules";
import { formatDayMonthYear } from "@/lib/format";

/** One sent coaching note: coach, session, evaluation and next practice (D.3 latest, D.4 list). */
export function ReportCard({
  report,
  isNew,
  average,
  rising,
  basePath = "/akun",
  pill,
}: {
  report: CoachReport;
  isNew?: boolean;
  average?: number | null;
  rising?: { label: string; delta: number }[];
  basePath?: string;
  /** The design rounds the download button fully in the notes list, 10px on the profile. */
  pill?: boolean;
}) {
  const s = report.session;
  const coach = s.coach_name ? `Coach ${s.coach_name}` : "Coach";
  const day = formatDayMonthYear(s.session_date);
  return (
    <article className="bg-[#F7F5FB] rounded-card p-4 md:p-4.5 flex flex-col gap-3.5 text-ink">
      <header className="flex items-center gap-3">
        <span aria-hidden className="w-10 h-10 rounded-full bg-indigo text-snow font-display font-bold text-input flex items-center justify-center flex-none">
          {(s.coach_name || "C")[0].toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-input">
            {coach}
            {isNew && <span className="ml-1.5 text-2xs font-bold text-[#B8321A] bg-coral/14 rounded-full px-2 py-0.5 align-middle">Baru</span>}
          </div>
          <div className="text-caption text-ink/65">
            {/* admin titles often carry the date already ("Mabar with Coach · Sen, 5 Okt 2026") */}
            {[s.title, !s.title.includes(day) && day, s.venue].filter(Boolean).join(" · ")}
          </div>
        </div>
        {average != null && (
          <div className="text-right flex-none">
            <div className="font-display font-bold text-xl text-indigo leading-none">{average}</div>
            <div className="text-2xs text-ink/55">rata-rata</div>
          </div>
        )}
      </header>
      {rising && rising.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {rising.map((r) => (
            <span key={r.label} className="rounded-md px-2 py-1 text-xs font-bold bg-[#E8F5EC] text-[#166534]">
              {r.label} ▲{r.delta}
            </span>
          ))}
        </div>
      )}
      {report.evaluation.length > 0 && (
        <div>
          <div className="text-xs font-bold tracking-caps text-[#B8321A]">EVALUASI</div>
          <ul className="mt-0.5 mb-0 pl-5 text-input leading-normal">
            {report.evaluation.map((t, i) => <li key={i} className="mt-1.5">{t}</li>)}
          </ul>
        </div>
      )}
      {report.next_practice.length > 0 && (
        <div>
          <div className="text-xs font-bold tracking-caps text-indigo">LATIHAN BERIKUTNYA</div>
          <ul className="mt-0.5 mb-0 pl-5 text-input leading-normal">
            {report.next_practice.map((t, i) => <li key={i} className="mt-1.5">{t}</li>)}
          </ul>
        </div>
      )}
      {/* D.6: the printable rapor opens in a new tab; "Save as PDF" names it like the hand-made ones */}
      <a
        href={`${basePath}/rapor/${report.id}`}
        target="_blank"
        rel="noopener"
        className={`self-start inline-flex items-center gap-2 min-h-11 px-4 border border-ink/15 bg-white text-ink text-sm no-underline hover:border-indigo ${
          pill ? "rounded-full font-bold" : "rounded-tile font-semibold"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 4v11" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 20h14" />
        </svg>
        Unduh rapor PDF
      </a>
    </article>
  );
}
