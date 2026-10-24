"use client";

import { useEffect, useState } from "react";
import { formatTimer } from "@/lib/format";

/** "Starting Soon · HH:MM:SS", ticking down to `startsAt`. Falls back to plain "Starting Soon". */
export function CountdownBadge({ startsAt, accent = "coral" }: { startsAt: string | null; accent?: "coral" | "win" }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startsAt]);

  const remaining = startsAt ? Math.floor((new Date(startsAt).getTime() - now) / 1000) : null;
  const text = remaining !== null && remaining > 0 ? `Starting Soon · ${formatTimer(remaining)}` : "Starting Soon";
  // Tailwind needs full literal class names in source — can't interpolate the accent into them.
  const cls =
    accent === "win"
      ? { wrap: "bg-win/15 border-win/50", dot: "bg-win", text: "text-win" }
      : { wrap: "bg-coral/15 border-coral/50", dot: "bg-coral", text: "text-coral" };

  return (
    <div className={`flex items-center gap-2.5 border rounded-full px-5 py-2 ${cls.wrap}`}>
      <div className={`w-2.5 h-2.5 rounded-full animate-livepulse ${cls.dot}`} />
      <div className={`font-sans font-bold text-base tracking-[0.1em] uppercase tabular-nums ${cls.text}`}>{text}</div>
    </div>
  );
}
