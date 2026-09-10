import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Overlay — Basecamp Padel",
  robots: { index: false, follow: false },
};

// OBS browser source: transparent background so the camera feed shows through.
export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="overlay-root" style={{ background: "transparent", minHeight: "100vh" }}>
      <style>{`html,body{background:transparent!important;overflow:hidden}`}</style>
      {children}
    </div>
  );
}
