import Link from "next/link";
import type { CoachReport, SessionAverage, SkillBoard, SkillScore } from "@/lib/coachingRules";
import { strongestAndWeakest } from "@/lib/coachingRules";
import { primaryButton } from "@/components/account/styles";
import { SkillBoardCard } from "./SkillBoardCard";
import { ProgressChart } from "./ProgressChart";
import { ReportCard } from "./ReportCard";

const card = "bg-white border border-ink/8 rounded-2xl p-5 md:p-6 flex flex-col gap-3 text-ink";
const cardTitle = "font-display font-bold text-xl m-0";
const LEGEND = "1 Belum bisa · 2 Mulai bisa · 3 Lumayan · 4 Bagus · 5 Mantap · ▲ naik dari sesi sebelumnya";

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

function Highlights({ best, weakest }: { best: SkillScore | null; weakest: SkillScore | null }) {
  if (!best && !weakest) return null;
  return (
    <section className={card}>
      {best && (
        <div>
          <div className="text-caption text-ink/60">Paling bagus</div>
          <span className="inline-block mt-1 rounded-lg px-2.5 py-1 font-bold text-caption bg-[#E8F5EC] text-[#166534]">{best.label}</span>
        </div>
      )}
      {weakest && (
        <div>
          <div className="text-caption text-ink/60">Perlu dilatih</div>
          <span className="inline-block mt-1 rounded-lg px-2.5 py-1 font-bold text-caption bg-[#FFE9E4] text-[#B83A22]">{weakest.label}</span>
        </div>
      )}
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

function NextFocus({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <section className="bg-volt/25 border border-volt rounded-2xl p-5 md:p-6 flex flex-col gap-2 text-ink">
      <div className="text-xs tracking-[0.14em] font-bold text-indigo">FOKUS LATIHAN BERIKUTNYA</div>
      <ul className="m-0 pl-5 text-input leading-normal">
        {items.map((t, i) => (
          <li key={i} className="mt-1">{t}</li>
        ))}
      </ul>
    </section>
  );
}

/**
 * D.2 + D.3: skill boards, progress, the latest note and the next focus (no level card).
 * Phone order follows the design: highlights, skill boards, then progress and notes. From md up the
 * boards fill the left column and the rest stacks on the right.
 */
export function StatsTab({
  boards,
  averages,
  latest,
  basePath = "/akun",
}: {
  boards: SkillBoard[];
  averages: SessionAverage[];
  latest: CoachReport | null;
  basePath?: string;
}) {
  const { best, weakest } = strongestAndWeakest(boards);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:grid-rows-[auto_1fr] gap-5 md:gap-6 items-start">
      <div className="flex flex-col gap-5 md:col-start-2 md:row-start-1">
        {latest ? <Highlights best={best} weakest={weakest} /> : <CoachingInvite />}
      </div>

      <div className="flex flex-col gap-5 md:col-start-1 md:row-start-1 md:row-span-2">
        {boards.map((b) => (
          <SkillBoardCard key={b.kind} board={b} footnote={b.kind === "teknik" ? LEGEND : undefined} />
        ))}
      </div>

      {latest && (
        <div className="flex flex-col gap-5 md:col-start-2 md:row-start-2">
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
          <NextFocus items={latest.next_practice} />
        </div>
      )}
    </div>
  );
}
