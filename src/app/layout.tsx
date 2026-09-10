import type { Metadata } from "next";
import { inter, spaceGrotesk } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Basecamp Padel — Start. Settle in. Level up.",
  description:
    "Komunitas mabar padel buat siapa aja — dari yang baru pegang raket sampai yang udah rutin naik level.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
