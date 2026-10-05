import Link from "next/link";
import { WHATSAPP_URL, YOUTUBE_URL } from "@/lib/config";
import type { EventItem } from "@/lib/events";

export function EventCard({ event }: { event: EventItem }) {
  const isPast = event.status === "finished";
  const isLive = event.status === "live";

  if (isPast) {
    return (
      <article className="bg-white border border-ink/8 rounded-2xl p-[22px] flex flex-col gap-4 text-ink h-full box-border shadow-xs">
        <div className="flex gap-3.5 items-center">
          <div className="flex-none w-16 rounded-xl bg-ink/5 py-2 flex flex-col items-center gap-0.5">
            <span className="text-[11px] font-bold tracking-[0.08em] text-ink/65">
              {event.day}
            </span>
            <span className="font-display font-bold text-[26px] leading-none text-ink">
              {event.date}
            </span>
            <span className="text-[11px] font-bold tracking-[0.08em] text-ink/65">
              {event.month}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex gap-1.5 flex-wrap items-center">
              {event.type === "kompetisi" ? (
                <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-coral/14 text-[#B8321A]">
                  Kompetisi
                </span>
              ) : (
                <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-indigo/8 text-indigo">
                  Mabar
                </span>
              )}
              <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-ink/6 text-ink/70">
                Selesai
              </span>
            </div>
            <Link href={`/jadwal/${event.slug || event.id}`} className="no-underline text-ink">
              <h3 className="font-display font-bold text-[19px] leading-snug m-0 hover:text-coral transition-colors">
                {event.title}
              </h3>
            </Link>
          </div>
        </div>

        <div className="text-sm text-ink/65">{event.subtitle}</div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-ink/65 text-xs uppercase tracking-[0.06em]">Venue</div>
            <div className="font-semibold mt-1 text-ink">{event.venue}</div>
          </div>
          <div>
            <div className="text-ink/65 text-xs uppercase tracking-[0.06em]">Jam</div>
            <div className="font-semibold mt-1 text-ink">{event.time}</div>
          </div>
          <div>
            <div className="text-ink/65 text-xs uppercase tracking-[0.06em]">Harga</div>
            <div className="font-semibold mt-1 text-ink">{event.price}</div>
          </div>
          <div>
            <div className="text-ink/65 text-xs uppercase tracking-[0.06em]">Peserta</div>
            <div className="font-semibold mt-1 text-ink">{event.slots}</div>
          </div>
        </div>

        <div className="mt-auto pt-2 flex flex-col gap-2">
          <Link
            href={`/jadwal/${event.slug || event.id}`}
            className="no-underline text-center border-[1.5px] border-ink/25 text-ink rounded-full py-3 px-4 font-sans font-bold text-sm transition-colors hover:bg-ink/5"
          >
            Lihat hasil
          </Link>
          <Link
            href={`/jadwal/${event.slug || event.id}`}
            className="no-underline text-center text-sm font-bold text-indigo py-1 hover:underline"
          >
            Lihat detail →
          </Link>
        </div>
      </article>
    );
  }

  // Upcoming / Live event card
  return (
    <article className="bg-indigo border border-indigo rounded-2xl p-[22px] flex flex-col gap-4 text-snow h-full box-border shadow-xs">
      <div className="flex gap-3.5 items-center">
        <div className="flex-none w-16 rounded-xl bg-snow/10 py-2 flex flex-col items-center gap-0.5">
          <span className="text-[11px] font-bold tracking-[0.08em] text-volt">
            {event.day}
          </span>
          <span className="font-display font-bold text-[26px] leading-none text-snow">
            {event.date}
          </span>
          <span className="text-[11px] font-bold tracking-[0.08em] text-snow/70">
            {event.month}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex gap-1.5 flex-wrap items-center">
            {event.type === "kompetisi" ? (
              <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-coral/20 text-[#ff8a73]">
                Kompetisi
              </span>
            ) : (
              <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-volt/16 text-volt">
                Mabar
              </span>
            )}
            {isLive && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold bg-coral/20 text-[#ff8a73]">
                <span className="w-1.5 h-1.5 rounded-full bg-coral animate-livepulse" />
                Berlangsung
              </span>
            )}
          </div>
          <Link href={`/jadwal/${event.slug || event.id}`} className="no-underline text-snow">
            <h3 className="font-display font-bold text-[19px] leading-snug m-0 hover:text-volt transition-colors">
              {event.title}
            </h3>
          </Link>
        </div>
      </div>

      <div className="text-sm text-snow/70">{event.subtitle}</div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-snow/70 text-xs uppercase tracking-[0.06em]">Venue</div>
          <div className="font-semibold mt-1 text-snow">{event.venue}</div>
        </div>
        <div>
          <div className="text-snow/70 text-xs uppercase tracking-[0.06em]">Jam</div>
          <div className="font-semibold mt-1 text-snow">{event.time}</div>
        </div>
        <div>
          <div className="text-snow/70 text-xs uppercase tracking-[0.06em]">Harga</div>
          <div className="font-semibold mt-1 text-snow">{event.price}</div>
        </div>
        <div>
          <div className="text-snow/70 text-xs uppercase tracking-[0.06em]">Peserta</div>
          <div className="font-semibold mt-1 text-snow">{event.slots}</div>
        </div>
      </div>

      <div className="mt-auto pt-2 flex flex-col gap-2">
        {isLive ? (
          <a
            href={YOUTUBE_URL}
            target="_blank"
            rel="noopener"
            className="no-underline text-center bg-coral text-ink rounded-full py-3 px-4 font-sans font-bold text-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Tonton live
          </a>
        ) : (
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener"
            className="no-underline bg-coral text-ink rounded-full py-3 px-4 font-sans font-bold text-sm text-center transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Daftar via WhatsApp
          </a>
        )}
        <Link
          href={`/jadwal/${event.slug || event.id}`}
          className="no-underline text-center text-sm font-bold text-volt py-1 hover:underline"
        >
          Lihat detail →
        </Link>
      </div>
    </article>
  );
}
