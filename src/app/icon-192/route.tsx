import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brandMark";

/** PWA icon (manifest.ts), 192x192 — the special icon.tsx convention only covers favicon/apple-icon. */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#17151F",
        }}
      >
        <BrandMark size={160} />
      </div>
    ),
    { width: 192, height: 192 },
  );
}
