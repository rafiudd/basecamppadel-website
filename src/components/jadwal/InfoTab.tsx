import Link from "next/link";
import { WHATSAPP_URL, YOUTUBE_URL } from "@/lib/config";
import type { EventItem } from "@/lib/events";
import { PlayerAvatar } from "@/components/PlayerAvatar";

export function InfoTab({ event }: { event: EventItem }) {
  const isLive = event.status === "live";
  const isOpen = event.status === "open";
  const isFinished = event.status === "finished";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 items-start">
      {/* Left Column (3fr) */}
      <div className="flex flex-col gap-5">
        {/* Tentang event */}
        <section className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-2.5 text-ink shadow-xs">
          <h2 className="font-display font-bold text-[19px] m-0">Tentang event</h2>
          <p className="text-[15px] leading-relaxed text-ink/80 m-0">
            {event.aboutText}
          </p>
        </section>

        {/* Format */}
        <section className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-2.5 text-ink shadow-xs">
          <h2 className="font-display font-bold text-[19px] m-0">Format</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {event.formatBoxes.map((box, i) => (
              <div
                key={i}
                className="bg-ink/4 rounded-xl p-3.5 text-center flex flex-col items-center justify-center min-w-0"
              >
                <div className="font-display font-bold text-2xl text-ink leading-tight">
                  {box.val}
                </div>
                <div className="text-[13px] text-ink/70 mt-0.5 leading-snug">
                  {box.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Poin Leaderboard (Only for Kompetisi) */}
        {event.type === "kompetisi" && (
          <section className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-2 text-ink shadow-xs">
            <h2 className="font-display font-bold text-[19px] m-0">Poin leaderboard</h2>
            <div className="flex justify-between items-center py-2.5 border-t border-ink/7 text-[15px]">
              <span className="text-ink/70">Juara</span>
              <span className="font-bold">80 poin</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-t border-ink/7 text-[15px]">
              <span className="text-ink/70">Runner-up</span>
              <span className="font-bold">50 poin</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-t border-ink/7 text-[15px]">
              <span className="text-ink/70">Semifinal</span>
              <span className="font-bold">30 poin</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-t border-ink/7 text-[15px]">
              <span className="text-ink/70">8 besar</span>
              <span className="font-bold">15 poin</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-t border-ink/7 text-[15px]">
              <span className="text-ink/70">Ikut fase grup</span>
              <span className="font-bold">5 poin</span>
            </div>
            <div className="text-[13px] text-ink/65 pt-1">
              Tiap pemain dapat poin tahap tertinggi yang dicapai.
            </div>
          </section>
        )}

        {/* Lokasi */}
        <section className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-2 text-ink shadow-xs">
          <h2 className="font-display font-bold text-[19px] m-0">Lokasi</h2>
          <div className="flex justify-between items-center py-2.5 border-t border-ink/7 text-[15px]">
            <span className="text-ink/70">Venue</span>
            <span className="font-bold">{event.venue}</span>
          </div>
          <div className="flex justify-between items-center py-2.5 border-t border-ink/7 text-[15px]">
            <span className="text-ink/70">Court</span>
            <span className="font-bold">{event.court}</span>
          </div>
          <a
            href="https://maps.google.com"
            target="_blank"
            rel="noopener"
            className="text-sm font-bold text-indigo no-underline pt-1 hover:underline"
          >
            Buka di Google Maps →
          </a>
        </section>
      </div>

      {/* Right Column (2fr) */}
      <div className="flex flex-col gap-5">
        {/* 1. If Open: Registration Card */}
        {isOpen && (
          <>
            <section className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-4 text-ink shadow-xs">
              <h2 className="font-display font-bold text-[19px] m-0">Pendaftaran</h2>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-ink/70">Harga</span>
                  <span className="font-bold text-base">{event.price}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-ink/70">Slot terisi</span>
                  <span className="font-bold text-base">{event.slots}</span>
                </div>
                <div className="w-full bg-ink/10 h-2 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-coral h-full rounded-full transition-all"
                    style={{ width: `${event.slotsPercent || 70}%` }}
                  />
                </div>
                {event.deadline && (
                  <div className="text-xs text-ink/60 mt-1">{event.deadline}</div>
                )}
              </div>

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener"
                className="mt-2 text-center no-underline bg-coral text-ink rounded-full py-3.5 px-4 font-sans font-bold text-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Daftar via WhatsApp
              </a>
            </section>

            {/* Registered participants/teams */}
            <section className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-3 text-ink shadow-xs">
              <h2 className="font-display font-bold text-[19px] m-0">
                {event.type === "kompetisi" ? "Tim terdaftar" : "Pemain terdaftar"}
              </h2>

              {event.registeredParticipants?.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-1.5 border-b border-ink/6 last:border-b-0">
                  <PlayerAvatar name={p.name} size="sm" showPadelBadge />
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm block truncate">{p.name}</span>
                    <span className="text-xs text-ink/60 block">{p.level}</span>
                  </div>
                </div>
              ))}

              {event.registeredTeams?.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-1.5 border-b border-ink/6 last:border-b-0">
                  <PlayerAvatar name={t.name} size="sm" showPadelBadge />
                  <span className="font-semibold text-sm truncate">{t.name}</span>
                </div>
              ))}
            </section>
          </>
        )}

        {/* 2. If Live: Stage Status Card */}
        {isLive && (
          <section className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-2.5 text-ink shadow-xs">
            <h2 className="font-display font-bold text-[19px] m-0">Peserta</h2>
            <div className="flex justify-between items-center py-2.5 border-t border-ink/7 text-[15px]">
              <span className="text-ink/70">Tim</span>
              <span className="font-bold">11 tim · 4 grup</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-t border-ink/7 text-[15px]">
              <span className="text-ink/70">Tahap sekarang</span>
              <span className="font-bold">Semifinal</span>
            </div>
            <a
              href={YOUTUBE_URL}
              target="_blank"
              rel="noopener"
              className="mt-2 text-center no-underline bg-coral text-ink rounded-full py-3.5 px-4 font-sans font-bold text-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Tonton live di YouTube
            </a>
          </section>
        )}

        {/* 3. If Finished: Podium HASIL AKHIR */}
        {isFinished && event.podium && (
          <section className="bg-indigo rounded-2xl p-6 flex flex-col gap-2 text-snow shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold tracking-[0.08em] text-volt">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
                <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
                <path d="M16 5h3v2a3 3 0 0 1-3 3" />
                <path d="M8 5H5v2a3 3 0 0 0 3 3" />
                <line x1="12" y1="13" x2="12" y2="17" />
                <path d="M8 20h8l-1-3H9z" />
              </svg>
              HASIL AKHIR
            </div>

            {event.podium.map((p, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3 py-2.5 ${idx > 0 ? "border-t border-snow/12" : ""}`}
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-[15px] flex-none ${
                    p.rank === 1
                      ? "bg-volt text-indigo"
                      : p.rank === 2
                      ? "bg-snow/90 text-indigo"
                      : "bg-snow/30 text-snow"
                  }`}
                >
                  {p.rank}
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="text-xs text-snow/70">{p.label}</span>
                  <span className="font-display font-bold text-base text-snow truncate">
                    {p.name}
                  </span>
                </span>
              </div>
            ))}

            <Link
              href="/leaderboard"
              className="mt-2 text-center no-underline border-[1.5px] border-snow/35 text-snow rounded-full py-3 px-4 font-sans font-bold text-sm transition-colors hover:bg-snow/10"
            >
              Lihat leaderboard
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
