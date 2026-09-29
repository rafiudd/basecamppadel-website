import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brandMark";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          background: "radial-gradient(ellipse at center, #2a2460 0%, #17151F 70%)",
          color: "#FBF7F1",
          fontFamily: "sans-serif",
        }}
      >
        <BrandMark size={100} />
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 90, height: 2, background: "rgba(251,247,241,0.3)" }} />
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700, letterSpacing: 6 }}>
            BASECAMP&nbsp;<span style={{ color: "#FF5A3C" }}>PADEL</span>
          </div>
          <div style={{ width: 90, height: 2, background: "rgba(251,247,241,0.3)" }} />
        </div>
        <div style={{ fontSize: 28, color: "rgba(251,247,241,0.75)" }}>
          Start. Settle in. Level up.
        </div>
      </div>
    ),
    { ...size },
  );
}
