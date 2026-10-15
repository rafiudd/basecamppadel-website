import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { YOUTUBE_URL } from "@/lib/config";
import { getPlayerById } from "@/lib/leaderboard";
import { getLiveMatch } from "@/lib/queries";
import { getAdminUser } from "@/lib/auth";
import { getAccount } from "@/lib/account";
import { loadCoaching } from "@/lib/profileData";
import type { CoachReport } from "@/lib/coachingRules";
import { LEVEL_DEFINITIONS, type PlayerLevelName } from "@/lib/coaching";

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
  const [{ isAdmin, isCoach }, player, liveMatch, account] = await Promise.all([
    getAdminUser(),
    getPlayerById(playerId),
    getLiveMatch(),
    getAccount(),
  ]);

  const canSeeLevelName = isAdmin || isCoach;

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

  // Coach notes are personal: only the logged-in player they belong to can read them. An
  // anonymous visitor sees a locked teaser; a visitor logged in as someone else sees nothing here.
  const isOwnPlayer = account.profile?.player_id === player.id;
  const { reports: coachReports } = isOwnPlayer
    ? await loadCoaching(account.supabase, player.id)
    : { reports: [] as CoachReport[] };

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
      <section className="bg-indigo text-snow px-6 md:px-12 pt-4 md:pt-6 overflow-hidden">
        <div className="relative w-full max-w-[1440px] mx-auto flex flex-col md:flex-row items-center md:items-end justify-between gap-8">
          {/* Big coral circle, vertically centered in the hero, its left edge curving behind the player
              (a quarter into the photo); the hero section clips it */}
          <div className="absolute -bottom-[260px] md:bottom-auto md:top-1/2 md:-translate-y-1/2 left-[calc(50%-70px)] md:left-auto md:-right-[710px] w-[760px] h-[760px] md:w-[980px] md:h-[980px] rounded-full bg-[linear-gradient(165deg,#FF5A3C_0%,#F26A45_55%,#E4573D_100%)]" />
          <div className="relative z-10 flex-1 flex flex-col gap-4 py-2 pb-6 md:pb-8 max-w-[580px]">
            <Link
              href="/leaderboard"
              className="no-underline text-snow/75 font-sans font-semibold text-sm hover:text-volt transition-colors inline-flex items-center gap-1"
            >
              ← Leaderboard
            </Link>

            <div className="flex items-baseline gap-4 flex-wrap">
              <div className="font-display font-bold text-[72px] sm:text-[88px] text-volt leading-none">
                {player.rank}
              </div>
              <h1 className="font-display font-bold text-[48px] sm:text-[60px] leading-none m-0">
                {player.name}
              </h1>
            </div>

            {/* Badges */}
            <div className="flex gap-2 flex-wrap items-center">
              <span className="rounded-full px-3 py-1.5 text-xs sm:text-[13px] font-bold bg-snow/12 text-snow">
                {player.gender}
              </span>
              <span className="rounded-full px-3 py-1.5 text-xs sm:text-[13px] font-bold bg-snow/12 text-snow flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block border border-snow/30"
                  style={{
                    backgroundColor:
                      (LEVEL_DEFINITIONS as any)[player.level]?.color ||
                      player.level_color ||
                      "#FFD43B",
                  }}
                />
                {canSeeLevelName ? (player.level || "Beginner") : "Level"}
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
          <div className="flex-none self-center md:self-end mt-7 md:mt-10 w-[280px] sm:w-[320px] md:w-[360px] h-[330px] sm:h-[380px] md:h-[420px] relative">
            {/* Soft glow right behind the photo, like the coaching rapor header */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-[60px] w-[380px] h-[380px] md:w-[480px] md:h-[480px] rounded-full bg-[radial-gradient(circle,rgba(190,130,150,.55)_0%,rgba(120,80,140,.25)_40%,rgba(27,22,80,0)_70%)]" />
            <Image
              src={
                player.photo_url ||
                (player.gender?.toLowerCase() === "women"
                  ? "/images/player-placeholder-women.svg"
                  : "/images/player-placeholder-men.svg")
              }
              alt={`Foto ${player.name}`}
              width={420}
              height={540}
              priority
              unoptimized
              className="relative block w-full h-full object-contain object-bottom origin-bottom scale-[1.2] drop-shadow-[0_6px_14px_rgba(0,0,0,0.35)]"
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

            {/* Catatan Coach (Publikasi Coaching) — personal, so it's gated by who's logged in */}
            {!account.user ? (
              <LockedCoachNotes playerId={player.id} />
            ) : (
              isOwnPlayer && (
                <div className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-4 text-ink shadow-xs">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-display font-bold text-xl m-0">Catatan Coach</h2>
                    {coachReports.length > 0 && (
                      <span className="text-xs font-semibold text-ink/60">
                        {coachReports.length} evaluasi tercatat
                      </span>
                    )}
                  </div>
                  {coachReports.length === 0 ? (
                    <p className="text-sm text-ink/60 m-0">Belum ada catatan coach untuk kamu.</p>
                  ) : (
                    <div className="flex flex-col divide-y divide-ink/8">
                      {coachReports.map((r) => (
                        <div key={r.id} className="py-3 flex flex-col gap-2 text-sm">
                          <div className="flex items-center justify-between text-xs text-ink/60 flex-wrap gap-1">
                            <span className="font-bold text-ink">
                              {r.session.title || "Sesi Coaching"}
                            </span>
                            <span>
                              {r.session.session_date}{" "}
                              {r.session.coach_name ? `· Coach ${r.session.coach_name}` : ""}
                            </span>
                          </div>
                          {r.evaluation.length > 0 && (
                            <div className="bg-ink/3 p-3 rounded-xl flex flex-col gap-1">
                              <span className="text-2xs uppercase tracking-wider font-bold text-indigo">
                                Evaluasi
                              </span>
                              <p className="text-xs text-ink/80 whitespace-pre-line m-0">
                                {r.evaluation.join("\n")}
                              </p>
                            </div>
                          )}
                          {r.next_practice.length > 0 && (
                            <div className="bg-volt/10 border border-volt/30 p-3 rounded-xl flex flex-col gap-1">
                              <span className="text-2xs uppercase tracking-wider font-bold text-ink">
                                Latihan Berikutnya
                              </span>
                              <p className="text-xs text-ink/80 whitespace-pre-line m-0">
                                {r.next_practice.join("\n")}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
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
                <span className="font-bold text-ink flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-ink/20 inline-block"
                    style={{
                      backgroundColor:
                        (LEVEL_DEFINITIONS as any)[player.level]?.color ||
                        player.level_color ||
                        "#FFD43B",
                    }}
                  />
                  {canSeeLevelName && <span>{player.level || "Beginner"}</span>}
                </span>
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

/** Blurred preview of the "Catatan Coach" card for a visitor who isn't logged in. */
function LockedCoachNotes({ playerId }: { playerId: string }) {
  const nextHref = `/masuk?next=${encodeURIComponent(`/leaderboard/${playerId}`)}`;
  return (
    <div className="relative bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-4 text-ink shadow-xs overflow-hidden">
      <h2 className="font-display font-bold text-xl m-0">Catatan Coach</h2>
      <div aria-hidden className="flex flex-col gap-2 blur-[6px] select-none pointer-events-none">
        <div className="h-3.5 w-2/3 rounded bg-ink/15" />
        <div className="h-20 rounded-xl bg-ink/6" />
        <div className="h-3.5 w-1/2 rounded bg-ink/15" />
        <div className="h-16 rounded-xl bg-volt/15" />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/60 px-6 text-center">
        <span className="w-10 h-10 rounded-full bg-indigo/10 text-indigo flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="11" width="16" height="9" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </span>
        <p className="text-sm font-semibold text-ink m-0">Masuk untuk lihat catatan coach kamu</p>
        <Link
          href={nextHref}
          className="no-underline bg-coral text-ink rounded-full py-2.5 px-5 font-sans font-bold text-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Masuk
        </Link>
      </div>
    </div>
  );
}
