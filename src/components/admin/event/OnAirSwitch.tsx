"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { setOnAir } from "@/app/admin/events/live-actions";

/** Compact ON AIR / OFF AIR switch for a running match. Several matches can be ON AIR, one per court. */
export function OnAirSwitch({ eventId, matchId, on, label }: { eventId: string; matchId: string; on: boolean; label: string }) {
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(on);

  const toggle = () =>
    start(async () => {
      const next = !shown;
      setShown(next);
      toast.result(await setOnAir(eventId, matchId, next), next ? `${label} ON AIR` : `${label} OFF AIR`);
    });

  return (
    <button
      type="button"
      role="switch"
      aria-checked={shown}
      aria-label={`ON AIR ${label}`}
      disabled={pending}
      onClick={toggle}
      className={`flex-none flex items-center gap-2 min-h-10 pl-2.5 pr-1.5 rounded-full border text-2xs font-bold tracking-tag whitespace-nowrap disabled:cursor-progress ${
        shown ? "border-coral/60 bg-coral/14 text-snow" : "border-snow/20 bg-snow/6 text-snow/70"
      }`}
    >
      {shown ? "ON AIR" : "OFF AIR"}
      <span className={`relative w-8 h-4.5 rounded-full transition-colors ${shown ? "bg-coral" : "bg-snow/25"}`}>
        <span
          className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-snow flex items-center justify-center transition-transform ${shown ? "translate-x-3.5" : ""}`}
        >
          {pending && <Spinner className="text-ink text-[9px]" label={null} />}
        </span>
      </span>
    </button>
  );
}
