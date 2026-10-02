import Image from "next/image";
import { SPONSOR_LOGOS } from "@/lib/config";

/**
 * Sponsor logos for the OBS overlay (live lower-third + off-air "Starting
 * Soon" screen). Replace the files in public/images/sponsors/ with real
 * logos, or edit SPONSOR_LOGOS in src/lib/config.ts to add/remove slots.
 */
export function SponsorStrip({ height = 28, label = true }: { height?: number; label?: boolean }) {
  if (SPONSOR_LOGOS.length === 0) return null;
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {label && (
        <span className="font-sans font-semibold text-[11px] uppercase tracking-[0.1em] text-snow/40">
          Didukung oleh
        </span>
      )}
      {SPONSOR_LOGOS.map((src, i) => (
        <div key={i} className="relative" style={{ height, width: height * 2.4 }}>
          <Image src={src} alt="" fill sizes={`${height * 2.4}px`} unoptimized className="object-contain object-left" />
        </div>
      ))}
    </div>
  );
}
