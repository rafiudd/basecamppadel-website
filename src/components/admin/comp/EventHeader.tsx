"use client";

import Link from "next/link";
import { useState } from "react";

const icon = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function CopyRow({ label, path }: { label: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the path is visible to copy by hand */
    }
  };
  return (
    <div className="flex items-center gap-2.5 justify-between py-2.5 border-t border-snow/10">
      <div className="min-w-0">
        <div className="text-[13px] text-snow/70">{label}</div>
        <code className="text-volt text-[13px] break-all">{path}</code>
      </div>
      <button type="button" onClick={copy} className="btn px-3 py-2 text-xs flex-none" aria-label={`Salin link ${label}`}>
        {copied ? "✓" : "Salin"}
      </button>
    </div>
  );
}

export function EventHeader({
  title,
  slug,
  dateLine,
  liveHref,
  editHref,
  publicHref,
  eventType = "kompetisi",
}: {
  title: string;
  slug: string;
  dateLine: string;
  liveHref: string;
  editHref: string;
  publicHref: string | null;
  eventType?: "kompetisi" | "mabar";
}) {
  const [obsOpen, setObsOpen] = useState(false);
  return (
    <div className="relative">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-2 min-w-0">
          <Link href="/admin/events" className="text-sm text-snow/70 no-underline hover:text-volt">← Event</Link>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display font-bold text-[26px] leading-tight m-0">{title}</h1>
            <span className={`inline-flex rounded-full px-2.5 py-[3px] text-xs font-bold ${
              eventType === "mabar" ? "bg-volt/20 text-volt" : "bg-coral/20 text-[#FF8A73]"
            }`}>
              {eventType === "mabar" ? "Mabar" : "Kompetisi"}
            </span>
          </div>
          <div className="text-sm text-snow/75">{dateLine}</div>
        </div>
        <div className="flex items-center gap-2 flex-none md:mt-[26px]">
          {publicHref && (
            <Link href={publicHref} target="_blank" className="text-xs text-snow/60 no-underline hover:text-volt mr-1">Halaman publik ↗</Link>
          )}
          <Link href={editHref} aria-label="Edit event" title="Edit event" className="w-11 h-11 rounded-[10px] bg-snow/12 text-snow flex items-center justify-center">
            <svg {...icon}><path d="M4 20h4L19 9l-4-4L4 16z" /><line x1="13" y1="7" x2="17" y2="11" /></svg>
          </Link>
          <button type="button" onClick={() => setObsOpen((v) => !v)} aria-label="Link OBS" title="Link OBS" aria-expanded={obsOpen} className="w-11 h-11 rounded-[10px] bg-snow/12 text-snow flex items-center justify-center border-none p-0">
            <svg {...icon}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>
          </button>
          <Link href={liveHref} aria-label="Buka Live" title="Buka Live" className="w-11 h-11 rounded-[10px] bg-coral text-ink flex items-center justify-center">
            <svg {...icon} width={22} height={22} strokeWidth={2}><circle cx="12" cy="12" r="9" /><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" /></svg>
          </Link>
        </div>
      </div>
      {obsOpen && (
        <div className="absolute right-0 top-full mt-2 z-20 w-[min(420px,100%)] bg-ink-3 border border-snow/12 rounded-[14px] px-4 pt-4 pb-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
          <div className="flex items-center justify-between gap-2">
            <div className="font-bold">Link OBS event ini</div>
            <button type="button" onClick={() => setObsOpen(false)} aria-label="Tutup" className="w-9 h-9 bg-transparent border-none text-snow/80 text-lg">×</button>
          </div>
          <p className="text-xs text-snow/70 mt-0.5 mb-1.5">Tetap sama sepanjang event, overlay ikut match yang ON AIR.</p>
          <CopyRow label="Scoreboard lower-third" path={`/overlay?event=${slug}`} />
          <CopyRow label="Opening card" path={`/overlay/opening?event=${slug}`} />
        </div>
      )}
    </div>
  );
}
