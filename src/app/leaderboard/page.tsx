import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { PageHeader } from "@/components/PageHeader";
import { RankRow } from "@/components/RankRow";
import { getActivePlayers, rankByGender } from "@/lib/queries";

export const revalidate = 60;
export const metadata: Metadata = { title: "Leaderboard — Basecamp Padel" };

export default async function LeaderboardPage() {
  const players = await getActivePlayers();
  const { men, women } = rankByGender(players);

  return (
    <PublicShell>
      <PageHeader eyebrow="Ranking" title="Leaderboard Basecamp" />
      <section className="px-4 sm:px-6 md:px-12 py-10 md:py-14 max-w-[1300px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div>
          <div className="bg-indigo text-snow text-center font-display font-bold text-base tracking-[0.08em] rounded-[10px] py-3 mb-6">
            MEN
          </div>
          {men.length === 0 && <p className="text-ink/50 font-sans text-sm">Belum ada pemain.</p>}
          {men.map((p) => (
            <RankRow key={p.id} player={p} accent="#1B1650" />
          ))}
        </div>
        <div>
          <div className="bg-coral text-snow text-center font-display font-bold text-base tracking-[0.08em] rounded-[10px] py-3 mb-6">
            WOMEN
          </div>
          {women.length === 0 && <p className="text-ink/50 font-sans text-sm">Belum ada pemain.</p>}
          {women.map((p) => (
            <RankRow key={p.id} player={p} accent="#FF5A3C" />
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
