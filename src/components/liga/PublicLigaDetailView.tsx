"use client";

import Link from "next/link";
import { LigaPoster } from "./LigaPoster";
import type { LeagueStandingRow, LeagueWithVolumes } from "@/lib/leagues";
import { formatDateShortIndo } from "@/lib/format";
import { WHATSAPP_URL } from "@/lib/config";

interface Props {
  league: LeagueWithVolumes;
  standings: LeagueStandingRow[];
}

export function PublicLigaDetailView({ league, standings }: Props) {
  const liveVol = league.volumes.find((v) => v.event?.status === "active");
  const liveStageName = liveVol?.live_stage_name || "Semifinal";
  const openVol = league.volumes.find((v) => v.event?.status === "draft" && v.event_id);
  const currentVol = liveVol ?? openVol ?? league.volumes[0];

  const primaryActionUrl = liveVol?.event?.slug
    ? `/jadwal/${liveVol.event.slug}`
    : openVol?.event?.whatsapp_url || WHATSAPP_URL;

  const primaryActionLabel = liveVol
    ? `Lihat Skor Live · Vol. ${liveVol.volume_number}`
    : openVol?.event?.event_date
    ? `Daftar Vol. ${openVol.volume_number} · ${formatDateShortIndo(openVol.event.event_date)}`
    : `Daftar Vol. ${currentVol?.volume_number ?? 1}`;

  const pointsRules = league.points;

  return (
    <div className="flex flex-col">
      {/* Hero Banner Section */}
      <section className="relative overflow-hidden bg-[#1F4A2C] px-6 md:px-12 py-10 md:py-16 text-white">
        {/* Background shapes */}
        <div
          aria-hidden="true"
          className="absolute -right-16 -top-20 w-64 h-64 rounded-full bg-[#F2E27A] border-4 border-white opacity-90 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -left-16 -bottom-16 w-52 h-52 rounded-full bg-[#F2E27A] border-4 border-white opacity-90 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(115deg, transparent 0 62%, rgba(255,255,255,0.07) 62% 66%, transparent 66%)",
          }}
        />

        <div className="relative w-full max-w-[1440px] mx-auto flex flex-col lg:flex-row gap-8 lg:gap-14 items-center justify-between">
          {/* Left Column in Hero */}
          <div className="flex-1 flex flex-col gap-5 items-start">
            <Link
              href="/liga"
              className="text-sm font-semibold text-white/75 hover:text-white no-underline transition-colors"
            >
              ← Semua liga
            </Link>

            <div className="flex gap-2 flex-wrap items-center">
              {liveVol ? (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold bg-coral text-ink">
                    <span aria-hidden="true" className="w-2 h-2 rounded-full bg-ink shadow-[0_0_0_4px_rgba(23,21,31,0.2)] animate-pulse" />
                    Vol. {liveVol.volume_number} Berlangsung
                  </span>
                  {league.organizer && (
                    <span className="rounded-full px-3 py-1 text-xs font-bold bg-white/14 text-white">
                      {league.organizer}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="rounded-full px-3 py-1 text-xs font-bold bg-white/14 text-white">
                    Liga · {league.total_volumes} volume
                  </span>
                  {league.organizer && (
                    <span className="rounded-full px-3 py-1 text-xs font-bold bg-white/14 text-white">
                      {league.organizer}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Typographic Title - 100% exact static lockup as in UI mockup */}
            <div
              aria-label="East Padel League"
              role="img"
              className="flex flex-col items-start leading-[0.88] relative select-none py-1"
            >
              <span
                className="text-[64px] sm:text-[88px] lg:text-[96px] text-white tracking-[-0.01em] font-black uppercase"
                style={{ fontFamily: "'Archivo Black', var(--font-space-grotesk), Impact, sans-serif" }}
              >
                EAST
              </span>
              <span
                className="text-[32px] sm:text-[42px] lg:text-[45px] text-[#F2E27A] -rotate-6 my-[-4px] lg:my-[-6px] ml-8 lg:ml-10 tracking-[0.01em] font-black uppercase"
                style={{
                  fontFamily: "'Archivo Black', var(--font-space-grotesk), Impact, sans-serif",
                  WebkitTextStroke: "2px #163821",
                }}
              >
                LEAGUE
              </span>
              <span
                className="text-[64px] sm:text-[88px] lg:text-[96px] text-white tracking-[-0.01em] font-black uppercase"
                style={{ fontFamily: "'Archivo Black', var(--font-space-grotesk), Impact, sans-serif" }}
              >
                PADEL
              </span>
            </div>

            <p className="m-0 text-base sm:text-[19px] leading-relaxed text-white max-w-[520px]">
              {liveVol
                ? `Vol. ${liveVol.volume_number} lagi jalan sekarang. ${liveStageName} sedang dimainkan, poin klasemen ke-update tiap match selesai.`
                : (league.description || "Arena untuk membuktikan sejauh mana kamu berkembang. Main. Bertanding. Kumpulkan poin. Prove your improvement.")}
            </p>

            {!liveVol && (
              <div className="flex flex-col gap-1.5 text-[15px] sm:text-[17px] font-semibold text-white/90">
                <div><span className="text-white/70">East Jogging</span> <span aria-hidden="true" className="text-[#F2E27A]">→</span> Improve your game.</div>
                <div><span className="text-[#F2E27A]">East Padel League</span> <span aria-hidden="true" className="text-[#F2E27A]">→</span> Prove your game.</div>
              </div>
            )}

            <div className="flex gap-3 items-center flex-wrap pt-1">
              {primaryActionUrl.startsWith("/") ? (
                <Link
                  href={primaryActionUrl}
                  className="bg-[#F2E27A] hover:bg-[#ffe866] text-[#163821] font-extrabold text-sm md:text-base px-6 py-3.5 rounded-full no-underline transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {primaryActionLabel}
                </Link>
              ) : (
                <a
                  href={primaryActionUrl}
                  target="_blank"
                  rel="noopener"
                  className="bg-[#F2E27A] hover:bg-[#ffe866] text-[#163821] font-extrabold text-sm md:text-base px-6 py-3.5 rounded-full no-underline transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {primaryActionLabel}
                </a>
              )}

              <a
                href="#poin"
                className="border-1.5 border-white/45 hover:border-white text-white font-bold text-sm md:text-base px-5 py-3 rounded-full no-underline transition-colors"
              >
                Lihat sistem poin
              </a>
            </div>
          </div>

          {/* Right Volume Schedule Card */}
          <div
            id="vol"
            className="w-full lg:w-[420px] bg-[#FFFDF6] text-[#1F4A2C] rounded-2xl overflow-hidden shadow-xl flex-none border border-black/5"
          >
            {/* Checkered top bar */}
            <div
              aria-hidden="true"
              className="h-4"
              style={{
                backgroundImage: "repeating-conic-gradient(#1F4A2C 0% 25%, #FFFFFF 0% 50%)",
                backgroundSize: "14px 14px",
              }}
            />

            <div className="p-6 md:p-7 flex flex-col gap-2">
              <div className="font-extrabold text-xs tracking-wider uppercase text-[#1F4A2C] mb-2">
                Jadwal Volume
              </div>

              <div className="flex flex-col divide-y-2 divide-[#1F4A2C]/15 border-y-2 border-[#1F4A2C]/15">
                {league.volumes.map((vol, index) => {
                  const event = vol.event;
                  const isLive = event?.status === "active";
                  const isFinished = event?.status === "finished";
                  const hasLink = !!event?.slug;

                  // Check if the previous volume is currently live
                  const prevVol = index > 0 ? league.volumes[index - 1] : null;
                  const isPrevVolLive = prevVol?.event?.status === "active";

                  // When there is no live volume and no event yet, use static mockup values
                  const isStaticVol1 = !liveVol && !event && vol.volume_number === 1;
                  const isStaticVol2 = !liveVol && !event && vol.volume_number === 2;
                  const isStaticVol3 = !liveVol && !event && vol.volume_number === 3;

                  let dateParts = { dayMonth: "TBA", year: "" };
                  if (event?.event_date) {
                    const d = new Date(event.event_date);
                    dateParts = {
                      dayMonth: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }).toUpperCase(),
                      year: String(d.getFullYear()),
                    };
                  } else if (vol.approx_date) {
                    dateParts = { dayMonth: vol.approx_date.toUpperCase(), year: "" };
                  } else if (isStaticVol1) {
                    dateParts = { dayMonth: "24 OKT", year: "2026" };
                  } else if (isStaticVol2) {
                    dateParts = { dayMonth: "NOV", year: "2026" };
                  } else if (isStaticVol3) {
                    dateParts = { dayMonth: "DES", year: "2026" };
                  }

                  let statusBadge = (
                    <span className="rounded-full px-2.5 py-0.5 text-2xs font-bold bg-[#1F4A2C]/8 text-[#1F4A2C] whitespace-nowrap">
                      {isPrevVolLive ? `Dibuka setelah Vol. ${prevVol?.volume_number}` : "Tanggal menyusul"}
                    </span>
                  );

                  if (isLive) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-2xs font-extrabold bg-coral text-ink whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-ink animate-pulse" />
                        LIVE · {vol.live_stage_name || "Semifinal"}
                      </span>
                    );
                  } else if (event) {
                    statusBadge = (
                      <span className="rounded-full px-2.5 py-0.5 text-2xs font-bold bg-[#F2E27A] text-[#163821] whitespace-nowrap">
                        {isFinished ? "Selesai" : "Pendaftaran dibuka"}
                      </span>
                    );
                  } else if (isStaticVol1) {
                    statusBadge = (
                      <span className="rounded-full px-2.5 py-0.5 text-2xs font-bold bg-[#F2E27A] text-[#163821] whitespace-nowrap">
                        Pendaftaran dibuka
                      </span>
                    );
                  }

                  const showArrow = hasLink || isStaticVol1;

                  const content = (
                    <div
                      className={`flex items-center gap-3.5 py-4 transition-colors ${
                        isLive ? "bg-coral/8 -mx-3 px-3 rounded-xl" : ""
                      }`}
                    >
                      <div className="w-20 font-extrabold text-sm leading-tight text-[#1F4A2C] flex-none">
                        {dateParts.dayMonth}
                        {dateParts.year && <br />}
                        {dateParts.year}
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col items-end gap-1 text-right">
                        <span className="font-display font-bold text-xl md:text-2xl text-[#1F4A2C] uppercase leading-none">
                          Vol. {vol.volume_number}{vol.is_final ? " · Final" : ""}
                        </span>
                        {statusBadge}
                      </div>

                      {showArrow ? (
                        <span className="w-8 h-8 rounded-full bg-[#1F4A2C] text-white flex items-center justify-center flex-none">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </span>
                      ) : (
                        <span aria-hidden="true" className="w-8 h-8 flex-none" />
                      )}
                    </div>
                  );

                  if (hasLink) {
                    return (
                      <Link
                        key={vol.id}
                        href={`/jadwal/${event.slug}`}
                        className="no-underline text-[#1F4A2C] hover:opacity-80 transition-opacity"
                      >
                        {content}
                      </Link>
                    );
                  }

                  if (isStaticVol1) {
                    return (
                      <a
                        key={vol.id}
                        href={primaryActionUrl}
                        target={primaryActionUrl.startsWith("/") ? undefined : "_blank"}
                        rel={primaryActionUrl.startsWith("/") ? undefined : "noopener"}
                        className="no-underline text-[#1F4A2C] hover:opacity-80 transition-opacity"
                      >
                        {content}
                      </a>
                    );
                  }

                  return <div key={vol.id}>{content}</div>;
                })}
              </div>

              <div className="text-xs text-[#1F4A2C]/75 mt-3 leading-relaxed">
                {liveVol
                  ? `Pendaftaran Vol. ${liveVol.volume_number + 1} dibuka setelah Vol. ${liveVol.volume_number} selesai.`
                  : "Tanggal Vol. 2 & 3 diumumkan menyusul. Stay tuned."}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="px-6 md:px-12 py-10 md:py-16 bg-snow text-ink">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-10 md:gap-14">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 md:gap-8 items-start">
            {/* Left Column: Points System & Live Event Card */}
            <div className="flex flex-col gap-6">
              {/* Live volume card if active */}
              {liveVol && liveVol.event && (
                <section className="bg-white border border-ink/8 rounded-2xl p-6 md:p-7 flex flex-col gap-4 shadow-xs">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-display font-bold text-xl m-0">
                      Vol. {liveVol.volume_number} Hari Ini
                    </h2>
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold bg-coral/14 text-coral-soft">
                      <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />
                      Live
                    </span>
                  </div>

                  <div className="text-sm text-ink/75">
                    Pertandingan sedang berlangsung sekarang. Poin klasemen sementara diperbarui setiap kali match selesai!
                  </div>

                  <Link
                    href={`/jadwal/${liveVol.event.slug}`}
                    className="btn btn-indigo text-snow font-bold text-sm py-3 rounded-full text-center no-underline mt-1"
                  >
                    Buka skor &amp; bagan live
                  </Link>
                </section>
              )}

              {/* Point Rules Card */}
              <section id="poin" className="bg-white border border-ink/8 rounded-2xl p-6 md:p-7 flex flex-col gap-3 shadow-xs">
                <h2 className="font-display font-bold text-xl md:text-2xl m-0">Sistem poin</h2>
                <p className="text-sm text-ink/70 m-0 leading-relaxed">
                  Poin per volume, dihitung berdasarkan tahap akhir yang berhasil kamu capai.
                </p>

                <div className="flex flex-col divide-y divide-ink/8 pt-2">
                  <div className="flex items-center gap-3 py-2.5">
                    <span className="w-7 h-7 rounded-full bg-[#E8B931] text-ink flex items-center justify-center font-extrabold text-xs flex-none">
                      1
                    </span>
                    <span className="flex-1 font-semibold text-sm">Champion</span>
                    <span className="font-display font-bold text-lg text-[#1F4A2C]">
                      {pointsRules.champion} <span className="text-xs font-sans text-ink/60 font-semibold">poin</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 py-2.5">
                    <span className="w-7 h-7 rounded-full bg-[#C9CDD6] text-ink flex items-center justify-center font-extrabold text-xs flex-none">
                      2
                    </span>
                    <span className="flex-1 font-semibold text-sm">Runner up</span>
                    <span className="font-display font-bold text-lg text-[#1F4A2C]">
                      {pointsRules.runner_up} <span className="text-xs font-sans text-ink/60 font-semibold">poin</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 py-2.5">
                    <span className="w-7 h-7 rounded-full bg-coral text-ink flex items-center justify-center font-extrabold text-xs flex-none">
                      SF
                    </span>
                    <span className="flex-1 font-semibold text-sm">Semifinalist</span>
                    <span className="font-display font-bold text-lg text-[#1F4A2C]">
                      {pointsRules.sf} <span className="text-xs font-sans text-ink/60 font-semibold">poin</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 py-2.5">
                    <span className="w-7 h-7 rounded-full bg-[#F2E27A] text-ink flex items-center justify-center font-extrabold text-xs flex-none">
                      QF
                    </span>
                    <span className="flex-1 font-semibold text-sm">Quarterfinalist (8 besar)</span>
                    <span className="font-display font-bold text-lg text-[#1F4A2C]">
                      {pointsRules.qf} <span className="text-xs font-sans text-ink/60 font-semibold">poin</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 py-2.5">
                    <span className="w-7 h-7 rounded-full bg-ink/10 text-ink flex items-center justify-center font-extrabold text-xs flex-none">
                      ·
                    </span>
                    <span className="flex-1 font-semibold text-sm">Partisipasi (fase grup)</span>
                    <span className="font-display font-bold text-lg text-[#1F4A2C]">
                      {pointsRules.group} <span className="text-xs font-sans text-ink/60 font-semibold">poin</span>
                    </span>
                  </div>
                </div>

                <div className="text-xs text-ink/60 mt-2 leading-relaxed">
                  Poin dihitung per pemain individual dan diakumulasikan sepanjang semua volume liga.
                </div>
              </section>
            </div>

            {/* Right Column: Standings Table */}
            <section className="bg-white border border-ink/8 rounded-2xl p-6 md:p-7 flex flex-col gap-4 shadow-xs">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display font-bold text-xl md:text-2xl m-0">
                  {liveVol ? "Klasemen sementara" : "Klasemen liga"}
                </h2>
                <span className="text-xs text-ink/60">
                  {liveVol ? "Update real-time" : "Total poin"}
                </span>
              </div>

              {standings.length === 0 ? (
                <div className="py-12 px-4 rounded-xl bg-[#1F4A2C]/5 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#1F4A2C]/10 text-[#1F4A2C] flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
                      <path d="M8 6H5a3 3 0 0 0 3 4" />
                      <path d="M16 6h3a3 3 0 0 1-3 4" />
                      <line x1="12" y1="13" x2="12" y2="17" />
                      <line x1="8" y1="20" x2="16" y2="20" />
                    </svg>
                  </div>
                  <div className="font-bold text-base text-ink">Belum ada poin</div>
                  <p className="text-sm text-ink/70 max-w-xs m-0 leading-relaxed">
                    Klasemen akan terisi secara otomatis setelah pertandingan Volume 1 dimulai.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 md:mx-0 px-6 md:px-0">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-ink/10 text-2xs uppercase tracking-caps text-ink/60">
                        <th className="py-2.5 pr-2 font-semibold w-8">#</th>
                        <th className="py-2.5 pr-2 font-semibold">Pemain</th>
                        {league.volumes.map((v) => (
                          <th key={v.id} className="py-2.5 px-2 font-semibold text-center w-12">
                            V{v.volume_number}
                          </th>
                        ))}
                        <th className="py-2.5 pl-2 font-semibold text-right w-16">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/8">
                      {standings.map((row) => (
                        <tr
                          key={row.playerId}
                          className={`transition-colors ${
                            row.hasProvisional ? "bg-coral/4" : "hover:bg-ink/3"
                          }`}
                        >
                          <td className="py-3 pr-2 font-display font-bold text-[#1F4A2C]">
                            {row.rank}
                          </td>
                          <td className="py-3 pr-2 font-semibold text-ink">
                            <Link
                              href={`/leaderboard/${row.playerId}`}
                              className="text-ink hover:text-coral transition-colors no-underline"
                            >
                              {row.playerName}
                            </Link>
                          </td>
                          {league.volumes.map((v) => {
                            const score = row.volumeScores[v.volume_number];
                            if (!score) {
                              return (
                                <td key={v.id} className="py-3 px-2 text-center text-ink/30 font-mono">
                                  –
                                </td>
                              );
                            }
                            return (
                              <td key={v.id} className="py-3 px-2 text-center font-bold text-ink">
                                {score.points}
                                {score.isProvisional && <span className="text-coral ml-0.5">*</span>}
                              </td>
                            );
                          })}
                          <td className="py-3 pl-2 text-right font-display font-bold text-base text-[#1F4A2C]">
                            {row.totalPoints}
                            {row.hasProvisional && <span className="text-coral ml-0.5 font-sans text-xs">*</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* How It Works section */}
          <div className="flex flex-col gap-6 pt-4 border-t border-ink/8">
            <h2 className="font-display font-bold text-2xl md:text-title m-0">Cara kerja liga</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-indigo text-volt flex items-center justify-center font-display font-bold text-lg flex-none">
                  1
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-display font-bold text-lg m-0">Ikut tiap volume</h3>
                  <p className="m-0 text-sm leading-relaxed text-ink/70">
                    Daftar di Vol. 1, Vol. 2, dan Vol. 3. Boleh mulai dari volume mana aja.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-indigo text-volt flex items-center justify-center font-display font-bold text-lg flex-none">
                  2
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-display font-bold text-lg m-0">Kumpulkan poin</h3>
                  <p className="m-0 text-sm leading-relaxed text-ink/70">
                    Poin dari hasil akhir tiap volume masuk ke klasemen liga. Ikut aja udah dapat 1 poin.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-indigo text-volt flex items-center justify-center font-display font-bold text-lg flex-none">
                  3
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-display font-bold text-lg m-0">Juara di Final</h3>
                  <p className="m-0 text-sm leading-relaxed text-ink/70">
                    Setelah volume terakhir (Final), total akumulasi poin tertinggi dinobatkan sebagai juara utama liga.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
