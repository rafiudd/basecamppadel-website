"use client";

import { useState } from "react";
import { CloseButton } from "@/components/ui/Modal";

/** How long the copy button shows its check mark. */
const COPIED_FEEDBACK_MS = 1500;
import { CheckIcon, CopyIcon } from "@/components/ui/icons";
import { courtLabel } from "@/lib/format";

type CourtRef = { id: string; name: string };

/**
 * OBS browser-source links of an event (stay the same for the whole event). Several matches can be
 * ON AIR at once (one per court), so with more than one court each court gets its own links.
 */
export function ObsLinks({ slug, courts = [], onClose }: { slug: string; courts?: CourtRef[]; onClose?: () => void }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="font-bold">Link OBS event ini</div>
        {onClose && <CloseButton onClick={onClose} />}
      </div>
      <p className="text-xs leading-normal text-snow/70 mt-0.5 mb-1.5">
        Satu link dipakai sepanjang event — otomatis ganti sendiri antara kartu "Starting Soon" dan scoreboard begitu match ON AIR.
        {courts.length > 1 && " Kalau lebih dari 1 match ON AIR, pakai link per court supaya tiap kamera menampilkan match di court-nya."}
      </p>
      <CopyRow label={courts.length > 1 ? "Overlay · ON AIR terbaru" : "Overlay"} path={`/overlay?event=${slug}`} />
      {courts.length > 1 &&
        courts.map((c) => (
          <div key={c.id}>
            <div className="pt-3 pb-0.5 border-t border-snow/8 text-2xs font-bold tracking-caps text-snow/60 uppercase">{courtLabel(c.name)}</div>
            <CopyRow label="Overlay" path={`/overlay?event=${slug}&court=${c.id}`} />
          </div>
        ))}
    </>
  );
}

/** The links card as a popover under a toggle button. */
export function ObsPopover({ slug, courts, onClose, top = "top-20" }: { slug: string; courts?: CourtRef[]; onClose: () => void; top?: string }) {
  return (
    <div className={`absolute right-0 ${top} z-20 w-full md:w-105 max-h-[70vh] overflow-y-auto bg-ink-3 border border-snow/12 rounded-card px-4 pt-4 pb-1.5 shadow-pop`}>
      <ObsLinks slug={slug} courts={courts} onClose={onClose} />
    </div>
  );
}

function CopyRow({ label, path }: { label: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      /* clipboard blocked — the path is visible to copy by hand */
    }
  };
  return (
    <div className="flex items-center gap-2.5 justify-between py-2.5 border-t border-snow/8">
      <div className="min-w-0">
        <div className="text-caption text-snow/70">{label}</div>
        <code className="font-mono text-volt text-caption break-all">{path}</code>
      </div>
      <button type="button" onClick={copy} className="btn min-h-10 px-4.5 py-2.5 flex items-center justify-center flex-none" aria-label={`Salin link ${label}`}>
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  );
}
