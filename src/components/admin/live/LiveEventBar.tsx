"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "nextjs-toploader/app";
import { EventTypeBadge } from "@/components/ui/Badge";
import { CheckIcon, ChevronDownIcon, LinkIcon } from "@/components/ui/icons";
import { ObsPopover } from "@/components/admin/event/ObsLinks";
import type { CompEvent } from "@/lib/database.types";

/** Unfinished matches of an event: ON AIR, being played (off air), and all that are left. */
export type EventLiveSummary = { onAir: number; playing: number; left: number };

const NONE: EventLiveSummary = { onAir: 0, playing: 0, left: 0 };

/** "● ON AIR · 2 berjalan · 6 sisa" */
function SummaryLine({ s }: { s: EventLiveSummary }) {
  const rest = [s.playing && `${s.playing} berjalan`, s.left ? `${s.left} match tersisa` : "semua match selesai"].filter(Boolean).join(" · ");
  return (
    <span className="text-caption text-snow/70">
      {s.onAir > 0 && <span className="font-bold text-coral-soft">● {s.onAir > 1 ? `${s.onAir} ` : ""}ON AIR · </span>}
      {rest}
    </span>
  );
}

/** Which event is being run (tap its name to switch to another running event) and its OBS links. */
export function LiveEventBar({
  event,
  running,
  summaries,
  courts,
}: {
  event: CompEvent;
  running: CompEvent[];
  summaries: Record<string, EventLiveSummary>;
  courts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [obsOpen, setObsOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canSwitch = running.some((o) => o.id !== event.id);
  // the current event first, then ON AIR ones, then by name
  const list = [...running].sort(
    (a, b) => Number(b.id === event.id) - Number(a.id === event.id) || (summaries[b.id]?.onAir ?? 0) - (summaries[a.id]?.onAir ?? 0) || a.title.localeCompare(b.title),
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !wrapRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const go = (id: string) => {
    if (id === event.id) return setOpen(false);
    setTarget(id);
    start(() => {
      router.push(`/admin/live?event=${id}`);
      setOpen(false);
    });
  };

  const title = (
    <span className="flex items-center gap-2 flex-wrap min-w-0">
      <span className="font-display font-bold text-title-sm text-left">{event.title}</span>
      <EventTypeBadge type={event.type} />
    </span>
  );

  return (
    <div ref={wrapRef} className="relative">
      <div className="bg-ink-3 rounded-card py-3 pl-4 pr-3 flex items-center gap-3">
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="text-xs font-bold tracking-caps text-snow/70">EVENT</div>
          {canSwitch ? (
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="self-start max-w-full flex items-center gap-2 border-none bg-transparent p-0 text-snow cursor-pointer hover:text-volt"
            >
              {title}
              <span className="flex-none flex items-center gap-1 text-caption font-semibold text-snow/70">
                Ganti
                <ChevronDownIcon className={`transition-transform ${open ? "rotate-180" : ""}`} />
              </span>
            </button>
          ) : (
            title
          )}
          <SummaryLine s={summaries[event.id] ?? NONE} />
        </div>
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

      {open && (
        <div role="listbox" aria-label="Event berjalan" className="absolute left-0 top-full mt-2 z-30 w-full md:w-110 bg-ink-3 border border-snow/12 rounded-card shadow-pop p-1.5 flex flex-col">
          <div className="px-3 pt-2 pb-1.5 text-2xs font-bold tracking-caps text-snow/60">{running.length} EVENT BERJALAN</div>
          {list.map((o) => {
            const current = o.id === event.id;
            return (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={current}
                onClick={() => go(o.id)}
                data-loading={pending && target === o.id ? "" : undefined}
                className={`w-full text-left border-none rounded-lg px-3 py-2.5 flex items-center gap-3 text-snow cursor-pointer ${current ? "bg-snow/8 shadow-mark-volt" : "bg-transparent hover:bg-snow/6"}`}
              >
                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">{o.title}</span>
                    <EventTypeBadge type={o.type} />
                  </span>
                  <SummaryLine s={summaries[o.id] ?? NONE} />
                </span>
                {current && <CheckIcon className="text-volt" />}
              </button>
            );
          })}
        </div>
      )}
      {obsOpen && <ObsPopover slug={event.slug} courts={courts} onClose={() => setObsOpen(false)} top="top-full mt-2" />}
    </div>
  );
}
