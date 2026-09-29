/**
 * The mountain mark for `next/og` ImageResponse contexts (icon.tsx, apple-icon.tsx,
 * opengraph-image.tsx) — satori renders raw SVG natively, so this mirrors
 * src/components/Logo.tsx's viewBox and shapes exactly.
 */
export function BrandMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <circle cx="24" cy="13" r="5" fill="#FFD43B" />
      <polygon points="25,13 16,30 34,30" fill="#FBF7F1" />
      <polygon points="17,14 7,30 27,30" fill="#FF5A3C" />
    </svg>
  );
}
