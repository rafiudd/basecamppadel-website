import Link from "next/link";
import type { EventItem } from "@/lib/events";

export function EventHeader({ event }: { event: EventItem }) {
  const isLive = event.status === "live";
  const isOpen = event.status === "open";
  const isFinished = event.status === "finished";

  return (
    <section className="bg-indigo px-6 md:px-12 pt-10 pb-12 text-snow">
      <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-3.5">
        <Link
          href="/jadwal"
          className="no-underline text-sm font-semibold text-snow/80 hover:text-volt transition-colors w-fit"
        >
          ← Jadwal
        </Link>

        <div className="flex gap-2 flex-wrap items-center">
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
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold bg-coral/22 text-[#ff8a73]">
              <span className="w-1.5 h-1.5 rounded-full bg-coral animate-livepulse" />
              Berlangsung
            </span>
          )}
          {isOpen && (
            <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-[#2f9e5c]/25 text-[#8fe3b2]">
              Pendaftaran dibuka
            </span>
          )}
          {isFinished && (
            <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-snow/12 text-snow/85">
              Selesai
            </span>
          )}
        </div>

        <h1 className="font-display font-bold text-3xl sm:text-[40px] leading-[1.15] m-0 text-snow">
          {event.title}
        </h1>

        <div className="flex gap-6 flex-wrap font-sans text-sm md:text-[15px] text-snow/85 pt-1">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="8" y1="3" x2="8" y2="7" />
              <line x1="16" y1="3" x2="16" y2="7" />
            </svg>
            {event.dateFormatted}
          </div>
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 14" />
            </svg>
            {event.time}
          </div>
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
              <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            {event.venueFormatted}
          </div>
        </div>
      </div>
    </section>
  );
}
