import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { YOUTUBE_URL } from "@/lib/config";
import { getPlayerById } from "@/lib/leaderboard";
import { getLiveMatch } from "@/lib/queries";

export const revalidate = 0;

type Props = { params: Promise<{ playerId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { playerId } = await params;
  const player = await getPlayerById(playerId);
  const name = player ? player.name : "Player";
  return { title: `${name} — Basecamp Padel` };
}

export default async function PlayerPage({ params }: Props) {
  const { playerId } = await params;
  const [player, liveMatch] = await Promise.all([
    getPlayerById(playerId),
    getLiveMatch(),
  ]);

  if (!player) {
    return (
      <PublicShell>
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 bg-snow text-ink">
          <p className="font-bold text-lg">Pemain tidak ditemukan.</p>
          <Link href="/leaderboard" className="text-sm text-indigo hover:underline">
            ← Kembali ke Leaderboard
          </Link>
        </div>
      </PublicShell>
    );
  }

  const isCurrentlyPlayingLive = Boolean(
    liveMatch &&
      liveMatch.is_live &&
      (liveMatch.team_a_player_ids?.includes(player.id) ||
        liveMatch.team_b_player_ids?.includes(player.id))
  );

  const totalMatches = player.wins + player.losses;
  const winRate = totalMatches > 0 ? Math.round((player.wins / totalMatches) * 100) : 0;

  return (
    <PublicShell>
      {/* Hero section */}
      <section className="bg-indigo text-snow px-6 md:px-12 pt-8 md:pt-12 overflow-hidden">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col md:flex-row items-center md:items-end justify-between gap-8">
          <div className="flex-1 flex flex-col gap-5 py-4 pb-8 md:pb-12 max-w-[580px]">
            <Link
              href="/leaderboard"
              className="no-underline text-snow/75 font-sans font-semibold text-sm hover:text-volt transition-colors inline-flex items-center gap-1"
            >
              ← Leaderboard
            </Link>

            <div className="flex items-baseline gap-4 flex-wrap">
              <div className="font-display font-bold text-[56px] text-volt leading-none">
                {player.rank}
              </div>
              <h1 className="font-display font-bold text-[36px] sm:text-[42px] leading-none m-0">
                {player.name}
              </h1>
            </div>

            {/* Badges */}
            <div className="flex gap-2 flex-wrap items-center">
              <span className="rounded-full px-3 py-1.5 text-xs sm:text-[13px] font-bold bg-snow/12 text-snow">
                {player.gender}
              </span>
              <span className="rounded-full px-3 py-1.5 text-xs sm:text-[13px] font-bold bg-snow/12 text-snow">
                {player.level || "Beginner"}
              </span>
              <span className="rounded-full px-3 py-1.5 text-xs sm:text-[13px] font-bold bg-snow/12 text-snow">
                {player.city || "Purwokerto"}
              </span>
            </div>

            {/* 4 Stat boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-[520px] pt-1">
              <div className="bg-snow/8 rounded-[10px] p-3 sm:p-3.5 min-w-0">
                <div className="font-sans text-[11px] text-snow/65 uppercase tracking-[0.06em]">
                  Poin
                </div>
                <div className="font-display font-bold text-xl sm:text-[22px] mt-1 text-snow">
                  {player.points}
                </div>
              </div>
              <div className="bg-snow/8 rounded-[10px] p-3 sm:p-3.5 min-w-0">
                <div className="font-sans text-[11px] text-snow/65 uppercase tracking-[0.06em]">
                  Rank
                </div>
                <div className="font-display font-bold text-xl sm:text-[22px] mt-1 text-snow">
                  #{player.rank}
                </div>
              </div>
              <div className="bg-snow/8 rounded-[10px] p-3 sm:p-3.5 min-w-0">
                <div className="font-sans text-[11px] text-snow/65 uppercase tracking-[0.06em]">
                  W–L
                </div>
                <div className="font-display font-bold text-xl sm:text-[22px] mt-1 text-snow">
                  {player.wins}–{player.losses}
                </div>
              </div>
              <div className="bg-snow/8 rounded-[10px] p-3 sm:p-3.5 min-w-0">
                <div className="font-sans text-[11px] text-snow/65 uppercase tracking-[0.06em]">
                  Win rate
                </div>
                <div className="font-display font-bold text-xl sm:text-[22px] mt-1 text-snow">
                  {winRate}%
                </div>
              </div>
            </div>
          </div>

          {/* Photo */}
          <div className="flex-none self-center md:self-end w-[260px] sm:w-[300px] md:w-[320px] h-[340px] md:h-[412px] relative">
            <Image
              src={
                player.photo_url ||
                (player.gender?.toLowerCase() === "women"
                  ? "/images/player-placeholder-women.svg"
                  : "/images/player-placeholder-men.svg")
              }
              alt={`Foto ${player.name}`}
              width={320}
              height={412}
              priority
              unoptimized
              className="block w-full h-full object-contain object-bottom"
            />
          </div>
        </div>
      </section>

      {/* Content section */}
      <section className="bg-snow px-6 md:px-12 py-10 md:py-16">
        <div className="w-full max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6 items-start">
          {/* Left Column: Events & Matches */}
          <div className="flex flex-col gap-6">
            {/* Riwayat Event */}
            {player.events && player.events.length > 0 && (
              <div className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-3 text-ink shadow-xs">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display font-bold text-xl m-0">Riwayat event</h2>
                  <span className="text-xs font-semibold text-ink/60">
                    Total {player.points} poin
                  </span>
                </div>

                <div className="flex flex-col divide-y divide-ink/8">
                  {player.events.map((ev, i) => (
                    <Link
                      key={i}
                      href={ev.slug ? `/jadwal/${ev.slug}` : "/jadwal"}
                      className="no-underline flex items-center gap-3 py-3 text-ink hover:bg-ink/3 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex-none w-14 font-sans font-bold text-[13px] text-ink/60">
                        {ev.date}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <span className="font-bold text-[15px] truncate">{ev.title}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              ev.type === "Kompetisi"
                                ? "bg-coral/14 text-[#B8321A]"
                                : "bg-indigo/8 text-indigo"
                            }`}
                          >
                            {ev.type}
                          </span>
                          <span className="text-xs text-ink/65">{ev.stage}</span>
                        </div>
                      </div>
                      <div className="flex-none text-right font-semibold text-xs text-ink/65">
                        {ev.points}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Riwayat Match Terakhir */}
            {player.matches && player.matches.length > 0 ? (
              <div className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-3 text-ink shadow-xs">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display font-bold text-xl m-0">Match terakhir</h2>
                  <span className="text-xs font-semibold text-ink/60">
                    {player.matches.length} match tercatat
                  </span>
                </div>

                <div className="flex flex-col divide-y divide-ink/8">
                  {player.matches.map((m, i) => (
                    <div key={i} className="flex items-center gap-3 py-3 text-ink">
                      <div className="flex-none w-28 flex flex-col">
                        <span className="font-bold text-xs text-ink/80 truncate">{m.round}</span>
                        <span className="text-[11px] text-ink/50 truncate">{m.court}</span>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-ink truncate">
                          vs {m.opponents}
                        </span>
                      </div>
                      <div className="flex-none flex items-center gap-2">
                        <span className="font-display font-bold text-sm text-ink">{m.score}</span>
                        {m.status === "live" ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold bg-coral/20 text-[#B8321A]">
                            <span className="w-1.5 h-1.5 rounded-full bg-coral animate-livepulse" />
                            Live
                          </span>
                        ) : m.isWin ? (
                          <span className="rounded-full px-2 py-0.5 text-[11px] font-bold bg-[#2f9e5c]/14 text-[#23794A]">
                            Menang
                          </span>
                        ) : (
                          <span className="rounded-full px-2 py-0.5 text-[11px] font-bold bg-ink/6 text-ink/60">
                            Kalah
                          </span>
                        )}
                        {m.streamUrl && (
                          <a
                            href={m.streamUrl}
                            target="_blank"
                            rel="noopener"
                            aria-label="Tonton replay match ini"
                            title="Tonton replay"
                            className="flex-none w-7 h-7 rounded-full bg-ink/6 text-ink/70 flex items-center justify-center hover:bg-coral hover:text-ink transition-colors"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-ink/8 rounded-2xl p-6 text-center text-ink/60 shadow-xs">
                Belum ada riwayat match yang tercatat untuk pemain ini.
              </div>
            )}
          </div>

          {/* Right Column: Breakdown & Live info */}
          <div className="flex flex-col gap-6">
            <div className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-3 text-ink shadow-xs">
              <h2 className="font-display font-bold text-xl m-0">Ringkasan Pemain</h2>
              <div className="flex justify-between items-center py-2 border-b border-ink/8 text-sm">
                <span className="text-ink/70">Level Permainan</span>
                <span className="font-bold text-ink">{player.level || "Beginner"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-ink/8 text-sm">
                <span className="text-ink/70">Domisili / Region</span>
                <span className="font-bold text-ink">{player.city || "Purwokerto"}</span>
              </div>
              <div className="flex justify-between items-center py-2 text-sm">
                <span className="font-bold text-ink">Total Poin</span>
                <span className="font-bold text-indigo text-base">{player.points} poin</span>
              </div>
            </div>

            {isCurrentlyPlayingLive && (
              <div className="bg-indigo rounded-2xl p-6 flex flex-col gap-3 text-snow">
                <div className="flex items-center gap-2 text-xs font-bold tracking-[0.08em] text-coral uppercase">
                  <span className="w-2 h-2 rounded-full bg-coral animate-livepulse" />
                  Lagi main sekarang
                </div>
                <p className="font-sans text-sm text-snow/80 leading-relaxed m-0">
                  {player.name} sedang bertanding di{" "}
                  {liveMatch?.session_label || "sesi Basecamp Padel"}.
                </p>
                <a
                  href={liveMatch?.stream_url || YOUTUBE_URL}
                  target="_blank"
                  rel="noopener"
                  className="mt-2 text-center no-underline bg-coral text-ink rounded-full py-3 px-4 font-sans font-bold text-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Tonton live stream
                </a>
              </div>
            )}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
