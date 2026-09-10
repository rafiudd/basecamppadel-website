import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { getPlayerWithHistory } from "@/lib/queries";
import { formatPointsDelta, winRate } from "@/lib/format";
import { YOUTUBE_URL } from "@/lib/config";

export const revalidate = 60;

type Props = { params: Promise<{ playerId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { playerId } = await params;
  const data = await getPlayerWithHistory(playerId);
  return { title: data ? `${data.player.name} — Basecamp Padel` : "Pemain — Basecamp Padel" };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-snow/8 rounded-[10px] px-4 py-3.5">
      <div className="font-sans text-[11px] text-snow/50 uppercase tracking-[0.06em]">{label}</div>
      <div className="font-display font-bold text-[20px] mt-1">{value}</div>
    </div>
  );
}

export default async function PlayerPage({ params }: Props) {
  const { playerId } = await params;
  const data = await getPlayerWithHistory(playerId);
  if (!data) notFound();
  const { player, history, rank } = data;

  return (
    <PublicShell>
      <section className="bg-indigo text-snow flex flex-wrap items-end relative pt-12">
        <div className="flex-1 min-w-[300px] md:min-w-[360px] px-6 md:px-12 pt-6 pb-12 flex flex-col gap-5 justify-center self-center">
          <Link href="/leaderboard" className="no-underline text-snow/60 font-sans font-semibold text-sm hover:text-volt">
            ← Leaderboard
          </Link>
          <div className="flex items-baseline gap-4 flex-wrap">
            <div className="font-display font-bold text-[56px] text-volt leading-none">{rank}</div>
            <h1 className="font-display font-bold text-[32px] md:text-[40px] leading-none">{player.name}</h1>
          </div>
          <div className="inline-flex items-center gap-2.5 bg-snow/10 rounded-[10px] px-4 py-2.5 w-fit">
            <span className="font-sans text-sm text-snow/60">{player.level}</span>
            <span className="w-px h-3.5 bg-snow/25" />
            <span className="font-sans font-bold text-sm">Poin {player.points}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 max-w-[420px]">
            <Stat label="W–L" value={`${player.wins}–${player.losses}`} />
            <Stat label="Win Rate" value={`${winRate(player.wins, player.losses)}%`} />
            <Stat label="Rank" value={`#${rank}`} />
          </div>
        </div>
        <div className="relative flex-none w-[240px] h-[310px] md:w-[320px] md:h-[412px] mx-auto md:mr-12">
          <Image
            src={player.photo_url || "/images/player-placeholder.svg"}
            alt={player.name}
            fill
            sizes="320px"
            unoptimized={!player.photo_url}
            className="object-contain object-bottom"
          />
        </div>
      </section>

      <section className="px-6 md:px-12 py-10 md:py-14 max-w-[900px] mx-auto flex flex-col gap-12 w-full">
        <div>
          <h2 className="font-display font-bold text-[20px] mb-4">Riwayat Match</h2>
          {history.length === 0 && (
            <p className="font-sans text-sm text-ink/50">Belum ada match yang tercatat.</p>
          )}
          <div className="flex flex-col">
            {history.map((h) => (
              <a
                key={h.id}
                href={h.stream_url || YOUTUBE_URL}
                target="_blank"
                rel="noopener"
                className="no-underline text-inherit grid grid-cols-[minmax(0,1fr)_70px_60px] sm:grid-cols-[minmax(0,1fr)_90px_70px] items-center px-1 py-4 border-b border-ink/8 rounded-md hover:bg-ink/3"
              >
                <div>
                  <div className="font-sans font-semibold text-[15px] underline decoration-ink/25">{h.session_label}</div>
                  <div className="font-sans text-[13px] text-ink/50 mt-0.5">vs {h.opponent_label}</div>
                </div>
                <div
                  className="font-sans font-bold text-[13px] text-center"
                  style={{ color: h.result === "W" ? "#2f9e5c" : "#e5484d" }}
                >
                  {h.result}
                </div>
                <div className="font-display font-bold text-[15px] text-right">{formatPointsDelta(h.points_delta)}</div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
