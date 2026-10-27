import Link from "next/link";
import type { EventItem } from "@/lib/events";

export function EventCard({ event }: { event: EventItem }) {
  const isPast = event.status === "finished";
  const isLive = event.status === "live";
  const detailUrl = `/jadwal/${event.slug || event.id}`;

  if (isPast) {
    return (
      <Link
        href={detailUrl}
        className="group bg-white border border-ink/8 hover:border-ink/20 rounded-2xl p-[22px] flex flex-col gap-4 text-ink h-full box-border shadow-xs hover:shadow-md transition-all duration-200 no-underline cursor-pointer"
      >
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
            <h3 className="font-display font-bold text-[19px] leading-snug m-0 text-ink group-hover:text-coral transition-colors">
              {event.title}
            </h3>
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
      </Link>
    );
  }

  // Upcoming / Live event card
  return (
    <Link
      href={detailUrl}
      className="group bg-indigo border border-indigo/80 hover:border-volt/40 rounded-2xl p-[22px] flex flex-col gap-4 text-snow h-full box-border shadow-xs hover:shadow-lg transition-all duration-200 no-underline cursor-pointer"
    >
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
          <h3 className="font-display font-bold text-[19px] leading-snug m-0 text-snow group-hover:text-volt transition-colors">
            {event.title}
          </h3>
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
    </Link>
  );
}
