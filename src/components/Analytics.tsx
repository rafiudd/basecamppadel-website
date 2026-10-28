"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { usePathname } from "next/navigation";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/** Staff tools, the OBS overlay (open for hours on the stream PC) and sample data — not real visitors. */
const UNTRACKED = ["/admin", "/overlay", "/akun-demo"];

function isUntracked(pathname: string) {
  return UNTRACKED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * GA4 for the public site. Off unless NEXT_PUBLIC_GA_ID is set (so dev/preview don't pollute prod data).
 * Untracked paths use gtag's official `ga-disable-<id>` switch: set during render, i.e. before the App
 * Router pushes the new URL, so GA's history page_view for that navigation is dropped too.
 */
export function Analytics() {
  const pathname = usePathname();
  if (!GA_ID) return null;

  // eslint-disable-next-line react-hooks/immutability -- intentional: must flip before the URL changes
  if (typeof window !== "undefined") (window as unknown as Record<string, boolean>)[`ga-disable-${GA_ID}`] = isUntracked(pathname);

  return <GoogleAnalytics gaId={GA_ID} />;
}
