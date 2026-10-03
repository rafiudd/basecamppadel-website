"use client";

import { useState, useTransition } from "react";
import { compactInputClass } from "@/components/ui/Field";
import { updateMatchSlot } from "@/app/admin/events/match-actions";
import { isoToWibTime, type CompetitionData } from "@/lib/compData";
import { courtLabel } from "@/lib/format";
import type { Match } from "@/lib/database.types";

/** Court + start time of a match, saved as soon as either changes. Locked once the match started. */
export function SlotControls({ m, data, locked, label }: { m: Match; data: CompetitionData; locked: boolean; label: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const courts = data.courts.filter((c) => data.event.court_ids.includes(c.id) || c.id === m.court_id);
  const time = isoToWibTime(m.starts_at);

  const save = (courtId: string, newTime: string) => {
    const fd = new FormData();
    fd.set("event_id", data.event.id);
    fd.set("match_id", m.id);
    fd.set("court_id", courtId);
    fd.set("time", newTime);
    start(async () => setError((await updateMatchSlot(null, fd))?.error ?? null));
  };

  return (
    <div className="flex items-center gap-1.5 flex-none" title={error ?? undefined}>
      <select
        aria-label={`Court ${label}`}
        disabled={locked || pending}
        defaultValue={m.court_id ?? ""}
        onChange={(e) => save(e.target.value, time)}
        className={`${compactInputClass} w-26 px-2`}
      >
        <option value="">—</option>
        {courts.map((c) => <option key={c.id} value={c.id}>{courtLabel(c.name)}</option>)}
      </select>
      <input
        aria-label={`Jam ${label}`}
        type="time"
        disabled={locked || pending}
        defaultValue={time}
        onBlur={(e) => e.target.value !== time && save(m.court_id ?? "", e.target.value)}
        className={`${compactInputClass} w-21 text-center px-1.5 scheme-dark`}
      />
      {error && <span role="alert" className="text-xs text-coral-soft">!</span>}
    </div>
  );
}
