import type { Metadata, Viewport } from "next";
import { inter, spaceGrotesk } from "./fonts";
import "./globals.css";
import { TopLoader } from "@/components/TopLoader";
import { PwaInstallPrompt } from "@/components/pwa/PwaInstallPrompt";
import { PushNotifPermission } from "@/components/pwa/PushNotifPermission";
import { Analytics } from "@/components/Analytics";
import { SITE_URL } from "@/lib/config";

/** Search Console "HTML tag" verification code (content="…" only). Not needed when verified via DNS. */
const googleVerification = process.env.GOOGLE_SITE_VERIFICATION;
const title = "Basecamp Padel — Start. Settle in. Level up.";
const description =
  "Komunitas mabar padel buat siapa aja — dari yang baru pegang raket sampai yang udah rutin naik level.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  keywords: ["padel", "mabar padel", "komunitas padel", "live score padel", "Basecamp Padel"],
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "Basecamp Padel",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: { index: true, follow: true },
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Basecamp Padel",
  },
};

/** Installed/"Add to Home Screen": fills the notch area and colors the status bar to match the app. */
export const viewport: Viewport = {
  themeColor: "#17151F",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <TopLoader />
        {children}
        <PwaInstallPrompt />
        <PushNotifPermission />
      </body>
      <Analytics />
    </html>
  );
}
