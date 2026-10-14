import Link from "next/link";
import type { CoachReport } from "@/lib/coachingRules";
import { CoachingInvite } from "./StatsTab";
import { ReportCard } from "./ReportCard";

type Summary = { average: number | null; rising: { label: string; delta: number }[] };

function href(basePath: string, coach: string | undefined, year: string | undefined) {
  const q = new URLSearchParams({ tab: "catatan" });
  if (coach) q.set("coach", coach);
  if (year) q.set("year", year);
  return `${basePath}?${q}`;
}

function Chip({ to, on, children }: { to: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={to}
      scroll={false}
      aria-current={on ? "true" : undefined}
      className={`no-underline rounded-full px-3.5 min-h-9 inline-flex items-center text-caption font-semibold border whitespace-nowrap ${
        on ? "bg-indigo border-indigo text-snow" : "bg-white border-ink/15 text-ink hover:border-indigo"
      }`}
    >
      {children}
    </Link>
  );
}

/** D.4: the player's own sent notes, newest first, filterable by coach and year. */
export function NotesTab({
  shown,
  newestId,
  summaries,
  coaches,
  years,
  coach,
  year,
  basePath = "/akun",
}: {
  shown: CoachReport[];
  newestId: string | null;
  summaries: Map<string, Summary>;
  coaches: string[];
  years: string[];
  coach?: string;
  year?: string;
  basePath?: string;
}) {
  if (!newestId) return <CoachingInvite />;
  return (
    <div className="flex flex-col gap-4 max-w-190">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
          <Chip to={href(basePath, undefined, year)} on={!coach}>Semua coach</Chip>
          {coaches.map((c) => (
            <Chip key={c} to={href(basePath, c, year)} on={coach === c}>Coach {c}</Chip>
          ))}
        </div>
        {years.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
            <Chip to={href(basePath, coach, undefined)} on={!year}>Semua tahun</Chip>
            {years.map((y) => (
              <Chip key={y} to={href(basePath, coach, y)} on={year === y}>{y}</Chip>
            ))}
          </div>
        )}
      </div>
      {shown.length ? (
        shown.map((r) => {
          const s = summaries.get(r.id);
          return (
            <div key={r.id} className="bg-white border border-ink/8 rounded-2xl p-3 md:p-4">
              <ReportCard report={r} isNew={r.id === newestId} average={s?.average} rising={s?.rising} basePath={basePath} pill />
            </div>
          );
        })
      ) : (
        <p className="m-0 text-sm text-ink/60">Belum ada catatan untuk filter ini.</p>
      )}
    </div>
  );
}
