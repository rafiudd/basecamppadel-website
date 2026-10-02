import { SPONSOR_LOGOS } from "@/lib/config";

/**
 * Sponsor / media-partner logos for the OBS overlay (live lower-third + off-air
 * "Starting Soon" screen). Replace the files in public/images/sponsors/ with
 * real logos, or edit SPONSOR_LOGOS / MEDIA_PARTNER_LOGOS in src/lib/config.ts.
 *
 * Plain <img> (not next/image) on purpose: real-world logos come in wildly
 * different aspect ratios (square, circular badge, wide wordmark) — fixing
 * height and letting width follow the file's natural ratio is the only way
 * to avoid squishing any of them.
 */
export function SponsorStrip({
  logos = SPONSOR_LOGOS,
  height = 40,
  maxWidth,
  label = "Didukung oleh",
  shape = "contain",
}: {
  logos?: string[];
  height?: number;
  maxWidth?: number;
  label?: string | null;
  shape?: "contain" | "circle";
}) {
  if (logos.length === 0) return null;
  return (
    <div className="flex items-center gap-6 flex-wrap">
      {label && (
        <span className="font-sans font-semibold text-[11px] uppercase tracking-[0.1em] text-snow/40 whitespace-nowrap">
          {label}
        </span>
      )}
      {logos.map((src, i) =>
        shape === "circle" ? (
          <div
            key={i}
            className="rounded-full overflow-hidden flex-none bg-snow/10"
            style={{ height, width: height }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={src}
            alt=""
            style={{ height, width: "auto", maxWidth: maxWidth ?? height * 4 }}
            className="object-contain"
          />
        ),
      )}
    </div>
  );
}
