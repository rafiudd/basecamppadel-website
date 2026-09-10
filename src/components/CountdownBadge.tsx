"use client";

import { useEffect, useState } from "react";
import { formatTimer } from "@/lib/format";

/** "Starting Soon · HH:MM:SS", ticking down to `startsAt`. Falls back to plain "Starting Soon". */
export function CountdownBadge({ startsAt }: { startsAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startsAt]);

  const remaining = startsAt ? Math.floor((new Date(startsAt).getTime() - now) / 1000) : null;
  const text = remaining !== null && remaining > 0 ? `Starting Soon · ${formatTimer(remaining)}` : "Starting Soon";

  return (
    <div className="flex items-center gap-2.5 bg-coral/15 border border-coral/50 rounded-full px-5 py-2">
      <div className="w-2.5 h-2.5 rounded-full bg-coral animate-livepulse" />
      <div className="font-sans font-bold text-base tracking-[0.1em] text-coral uppercase tabular-nums">{text}</div>
    </div>
  );
}
