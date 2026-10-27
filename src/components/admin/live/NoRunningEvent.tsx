import Link from "next/link";
import { EventTypeBadge, StatusBadge } from "@/components/ui/Badge";
import { TrophyIcon } from "@/components/ui/icons";
import { eventFormatLabel } from "@/lib/eventFormats";
import type { CompEvent } from "@/lib/database.types";

/**
 * Live page when no event is running: how to start one, and the drafts that are ready. A score keeper
 * (`canManageEvents` false) can't open event pages, so only gets told to wait for an admin.
 */
export function NoRunningEvent({ drafts, canManageEvents = true }: { drafts: CompEvent[]; canManageEvents?: boolean }) {
  return (
    <>
      <div className="border border-dashed border-snow/25 rounded-panel px-6 py-10 md:p-12 flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-full bg-ink-3 text-volt flex items-center justify-center"><TrophyIcon size={26} /></div>
        <div className="font-display font-bold text-title">Belum ada event berjalan</div>
        {canManageEvents ? (
          <>
            <p className="text-input leading-prose text-snow/75 m-0 max-w-115">Live match selalu nempel ke satu event. Mulai event yang sudah ada, atau buat event baru dulu.</p>
            <div className="flex gap-2 flex-wrap justify-center mt-1">
              <Link href="/admin/events/new" className="btn btn-coral text-ink no-underline tracking-button">+ Buat Event</Link>
              <Link href="/admin/events" className="btn no-underline text-snow tracking-button">Lihat semua event</Link>
            </div>
          </>
        ) : (
          <p className="text-input leading-prose text-snow/75 m-0 max-w-115">Live match selalu nempel ke satu event. Minta admin memulai event-nya dulu, lalu muat ulang halaman ini.</p>
        )}
      </div>
      {canManageEvents && drafts.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="text-xs font-bold tracking-caps text-snow/70">SIAP DIMULAI</div>
          {drafts.map((e) => (
            <div key={e.id} className="bg-ink-3 rounded-card py-3.5 pl-4 pr-2 flex items-center gap-3">
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="font-display font-bold text-base">{e.title}</div>
                <div className="text-caption leading-copy text-snow/70">
                  <div className="flex gap-1.5 mt-0.5 mb-1">
                    <EventTypeBadge type={e.type} />
                    <StatusBadge status={e.status} />
                  </div>
                  {eventFormatLabel(e)}
                </div>
              </div>
              <Link href={`/admin/events/${e.id}`} className="btn btn-volt no-underline min-h-10 px-4.5 tracking-button whitespace-nowrap flex-none">Mulai event</Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
