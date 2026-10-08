"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MountainMark } from "./Logo";
import { WHATSAPP_URL } from "@/lib/config";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/jadwal", label: "Jadwal" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function Nav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Desktop Nav */}
      <nav className="hidden md:flex sticky top-0 z-30 items-center justify-between gap-4 px-6 md:px-12 h-[88px] bg-ink border-b border-snow/10">
        <Link href="/" className="flex items-center gap-3.5 no-underline">
          <MountainMark size={34} />
          <div className="font-display font-bold text-[18px] leading-[1.1] text-snow">
            BASECAMP
            <br />
            <span className="text-coral">PADEL</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`no-underline text-snow rounded-full px-[18px] py-2.5 font-sans font-semibold text-sm transition-colors ${
                isActive(l.href) ? "bg-snow/12" : "bg-transparent hover:bg-snow/8"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener"
          className="no-underline bg-coral text-ink font-sans font-bold text-sm px-[22px] py-3 rounded-full whitespace-nowrap transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Gabung Mabar
        </a>
      </nav>


      {/* Mobile top bar: just branding — nav lives in the bottom tab bar instead */}
      <nav
        className="md:hidden sticky top-0 z-30 flex items-center justify-center px-4 h-14 bg-ink border-b border-snow/10"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <Link href="/" className="flex items-center gap-2 no-underline">
          <MountainMark size={26} />
          <div className="font-display font-bold text-sm leading-none text-snow">
            BASECAMP <span className="text-coral">PADEL</span>
          </div>
        </Link>
      </nav>
    </>
  );
}

export function MobileNav() {
  return null;
}

