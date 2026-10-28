import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  // Vercel preview deployments must never compete with prod in search results.
  if (process.env.VERCEL_ENV === "preview") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Login-gated, staff-only, the OBS overlay, and endpoints — nothing a search result should land on.
      disallow: ["/admin", "/akun", "/akun-demo", "/masuk", "/overlay", "/api/", "/auth/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
