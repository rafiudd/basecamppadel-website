"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EventTypeBadge } from "@/components/ui/Badge";
import { LinkIcon } from "@/components/ui/icons";
import { ObsPopover } from "@/components/admin/event/ObsLinks";
import type { CompEvent } from "@/lib/database.types";

/** Which event is being run, a switcher between running events, and its OBS links. */
export function LiveEventBar({ event, running }: { event: CompEvent; running: CompEvent[] }) {
  const router = useRouter();
  const [obsOpen, setObsOpen] = useState(false);
  const others = running.filter((o) => o.id !== event.id);
  return (
    <div className="relative">
      <div className="bg-ink-3 rounded-card py-3 pl-4 pr-3 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="text-xs font-bold tracking-caps text-snow/70">EVENT</div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold text-title-sm">{event.title}</span>
            <EventTypeBadge type={event.type} />
          </div>
        </div>
        {others.length > 0 && (
          <select
            aria-label="Ganti event"
            value=""
            onChange={(e) => e.target.value && router.push(`/admin/live?event=${e.target.value}`)}
            className="bg-snow/10 border-none rounded-lg px-3 py-2.5 min-h-11 text-input text-snow box-border outline-none w-auto flex-none"
          >
            <option value="">Ganti event ({running.length} berjalan)</option>
            {others.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
          </select>
        )}
        <button
          type="button"
          onClick={() => setObsOpen((v) => !v)}
          aria-label="Link OBS"
          title="Link OBS"
          aria-expanded={obsOpen}
          className="w-11 h-11 border-none rounded-tile bg-snow/12 text-snow flex items-center justify-center p-0 flex-none"
        >
          <LinkIcon />
        </button>
      </div>
      {obsOpen && <ObsPopover slug={event.slug} onClose={() => setObsOpen(false)} top="top-19" />}
    </div>
  );
}
