import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brandMark";

/** PWA icon (manifest.ts), 512x512 — the special icon.tsx convention only covers favicon/apple-icon. */
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
        <BrandMark size={420} />
      </div>
    ),
    { width: 512, height: 512 },
  );
}
