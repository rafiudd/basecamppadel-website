import Link from "next/link";
import type { CoachReport, NextSession, SessionAverage, SkillBoard, SkillMap } from "@/lib/coachingRules";
import { primaryButton } from "@/components/account/styles";
import { SkillBoards } from "./SkillBoards";
import { SkillRadar } from "./SkillRadar";
import { ProgressChart } from "./ProgressChart";
import { ReportCard } from "./ReportCard";
import { card, cardTitle, NextSessionCard } from "./SideCards";

/** No sent report yet: invite to the first coaching session. */
export function CoachingInvite() {
  return (
    <section className="bg-indigo text-snow rounded-2xl p-5 md:p-6 flex flex-col gap-3 items-start">
      <div className="text-xs tracking-[0.14em] font-bold text-volt">BELUM ADA PENILAIAN</div>
      <h2 className="font-display font-bold text-xl m-0">Ikut Mabar with Coach</h2>
      <p className="m-0 text-sm text-snow/75 leading-copy">
        Coach bakal menilai teknik &amp; cara main kamu tiap sesi. Nilai, progres, dan catatannya muncul di sini.
      </p>
      <Link href="/jadwal" className={primaryButton}>Lihat jadwal</Link>
    </section>
  );
}

function Progress({ averages }: { averages: SessionAverage[] }) {
  if (!averages.length) return null;
  const change = averages.length >= 2 ? Math.round((averages.at(-1)!.avg - averages[0].avg) * 10) / 10 : null;
  return (
    <section className={card}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={cardTitle}>Progres rata-rata</h2>
        {change !== null && (
          <span className={`text-caption font-bold ${change > 0 ? "text-[#23794A]" : "text-ink/60"}`}>
            {change > 0 ? `▲ ${change}` : change < 0 ? `▼ ${Math.abs(change)}` : "Stabil"} dalam {averages.length} sesi
          </span>
        )}
      </div>
      <ProgressChart points={averages} />
    </section>
  );
}

/**
 * D.2 + D.3 (per the "Statistik" design): the skill map and the compact skill boards on the left;
 * progress, the latest note and the next session on the right. Phones stack them in that order.
 */
export function StatsTab({
  boards,
  radar,
  averages,
  latest,
  nextSession,
  basePath = "/akun",
}: {
  boards: SkillBoard[];
  radar: SkillMap;
  averages: SessionAverage[];
  latest: CoachReport | null;
  nextSession?: NextSession | null;
  basePath?: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5 md:gap-6 items-start">
      <div className="flex flex-col gap-5">
        <SkillRadar {...radar} />
        <SkillBoards boards={boards} />
      </div>

      <div className="flex flex-col gap-5">
        {latest ? (
          <>
            <Progress averages={averages} />
            <section className={card}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className={cardTitle}>Catatan coach terbaru</h2>
                <Link href={`${basePath}?tab=catatan`} className="text-sm font-bold text-indigo no-underline">
                  Lihat semua →
                </Link>
              </div>
              <ReportCard report={latest} isNew basePath={basePath} />
            </section>
          </>
        ) : (
          <CoachingInvite />
        )}
        <NextSessionCard session={nextSession} />
      </div>
    </div>
  );
}
