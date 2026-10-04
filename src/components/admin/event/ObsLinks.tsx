"use client";

import { useState } from "react";
import { CloseButton } from "@/components/ui/Modal";

/** How long the copy button shows its check mark. */
const COPIED_FEEDBACK_MS = 1500;
import { CheckIcon, CopyIcon } from "@/components/ui/icons";

/** OBS browser-source links of an event (stay the same for the whole event). */
export function ObsLinks({ slug, onClose }: { slug: string; onClose?: () => void }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="font-bold">Link OBS event ini</div>
        {onClose && <CloseButton onClick={onClose} />}
      </div>
      <p className="text-xs leading-normal text-snow/70 mt-0.5 mb-1.5">Tetap sama sepanjang event, overlay ikut match yang ON AIR.</p>
      <CopyRow label="Scoreboard lower-third" path={`/overlay?event=${slug}`} />
      <CopyRow label="Opening card" path={`/overlay/opening?event=${slug}`} />
    </>
  );
}

/** The links card as a popover under a toggle button. */
export function ObsPopover({ slug, onClose, top = "top-20" }: { slug: string; onClose: () => void; top?: string }) {
  return (
    <div className={`absolute right-0 ${top} z-20 w-full md:w-105 bg-ink-3 border border-snow/12 rounded-card px-4 pt-4 pb-1.5 shadow-pop`}>
      <ObsLinks slug={slug} onClose={onClose} />
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
