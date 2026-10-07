"use client";

import NextTopLoader from "nextjs-toploader";
import { usePathname } from "next/navigation";

/**
 * Thin progress bar on top while a page loads (link clicks, and `router.push` through
 * `useRouter` from "nextjs-toploader/app"). Volt on the dark admin, coral on the light public site;
 * never on the OBS overlays, which are captured live on stream.
 */
export function TopLoader() {
  const pathname = usePathname();
  if (pathname.startsWith("/overlay")) return null;
  const admin = pathname.startsWith("/admin");
  return (
    <NextTopLoader
      color={admin ? "#ffd43b" : "#ff5a3c"}
      height={3}
      showSpinner={false}
      crawlSpeed={200}
      speed={200}
      shadow={false}
      zIndex={1600}
    />
  );
}
