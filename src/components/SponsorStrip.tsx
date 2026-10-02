import { SPONSOR_LOGOS } from "@/lib/config";

/**
 * Sponsor logos for the OBS overlay (live lower-third + off-air "Starting
 * Soon" screen). Replace the files in public/images/sponsors/ with real
 * logos, or edit SPONSOR_LOGOS in src/lib/config.ts to add/remove slots.
 *
 * Plain <img> (not next/image) on purpose: real-world sponsor logos come in
 * wildly different aspect ratios (square, circular badge, wide wordmark) —
 * fixing height and letting width follow the file's natural ratio is the
 * only way to avoid squishing any of them.
 */
export function SponsorStrip({ height = 40, maxWidth, label = true }: { height?: number; maxWidth?: number; label?: boolean }) {
  if (SPONSOR_LOGOS.length === 0) return null;
  return (
    <div className="flex items-center gap-6 flex-wrap">
      {label && (
        <span className="font-sans font-semibold text-[11px] uppercase tracking-[0.1em] text-snow/40">
          Didukung oleh
        </span>
      )}
      {SPONSOR_LOGOS.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={src}
          alt=""
          style={{ height, width: "auto", maxWidth: maxWidth ?? height * 4 }}
          className="object-contain"
        />
      ))}
    </div>
  );
}
