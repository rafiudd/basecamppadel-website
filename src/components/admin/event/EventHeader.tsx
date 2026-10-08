"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { BackLink } from "@/components/ui/PageHeader";
import { EventTypeBadge } from "@/components/ui/Badge";
import { EditIcon, LinkIcon, PlayIcon, ResetIcon } from "@/components/ui/icons";
import { resetEvent } from "@/app/admin/events/actions";
import type { CompEvent, Court, Venue } from "@/lib/database.types";
import { ObsPopover } from "./ObsLinks";
import { EditEventModal } from "./EditEventModal";

const squareBtn = "w-11 h-11 rounded-tile flex items-center justify-center border-none p-0";

/** Event title block with Edit / Link OBS / Buka Live. */
export function EventHeader({
  event,
  dateLine,
  publicHref,
  venues,
  courts,
}: {
  event: CompEvent;
  dateLine: string;
  publicHref: string | null;
  venues: Venue[];
  courts: Court[];
}) {
  const [obsOpen, setObsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  return (
    <div className="relative">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2 min-w-0">
          <BackLink href="/admin/events" label="Event" />
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display font-bold text-page leading-heading m-0">{event.title}</h1>
            <EventTypeBadge type={event.type} />
          </div>
          <div className="text-sm leading-normal text-snow/75">
            {dateLine}
            {publicHref && (
              <Link href={publicHref} target="_blank" className="ml-2 text-snow/60 no-underline hover:text-volt whitespace-nowrap">Halaman publik ↗</Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-none mt-6.5">
          <button type="button" onClick={() => setEditOpen(true)} aria-label="Edit event" title="Edit event" className={`${squareBtn} bg-snow/12 text-snow`}>
            <EditIcon />
          </button>
          <button type="button" onClick={() => setObsOpen((v) => !v)} aria-label="Link OBS" title="Link OBS" aria-expanded={obsOpen} className={`${squareBtn} bg-snow/12 text-snow`}>
            <LinkIcon />
          </button>
          <Link href={`/admin/live?event=${event.id}`} aria-label="Buka Live" title="Buka Live" className={`${squareBtn} bg-coral text-ink`}>
            <PlayIcon strokeWidth={2} />
          </Link>
          <ActionForm
            action={resetEvent}
            successText="Event direset"
            confirmText="Reset event? Jadwal, check-in, dan semua skor dihapus balik ke awal — daftar peserta/tim tetap. Kalau event ini sudah selesai, poin leaderboard yang sudah dibagikan juga ditarik balik. Nggak bisa dibatalkan."
            confirmLabel="Ya, reset event"
            danger
          >
            <input type="hidden" name="event_id" value={event.id} />
            <button type="submit" aria-label="Reset event" title="Reset event" className={`${squareBtn} bg-loss/15 text-loss`}>
              <ResetIcon />
            </button>
          </ActionForm>
        </div>
      </div>
      {obsOpen && <ObsPopover slug={event.slug} courts={courts.filter((c) => event.court_ids.includes(c.id))} onClose={() => setObsOpen(false)} />}
      {editOpen && <EditEventModal event={event} venues={venues} courts={courts} onClose={() => setEditOpen(false)} />}
    </div>
  );
}
