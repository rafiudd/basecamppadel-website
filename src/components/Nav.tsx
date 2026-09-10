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
    <nav className="sticky top-0 z-20 flex items-center justify-between gap-4 px-6 md:px-12 h-[72px] md:h-[88px] bg-ink border-b border-snow/10">
      <Link href="/" className="flex items-center gap-3.5 no-underline">
        <MountainMark size={34} />
        <div className="font-display font-bold text-[18px] leading-[1.1] text-snow">
          BASECAMP
          <br />
          <span className="text-coral">PADEL</span>
        </div>
      </Link>

      <div className="hidden sm:flex items-center gap-2">
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
        className="no-underline bg-coral text-snow font-sans font-bold text-sm px-[22px] py-3 rounded-full whitespace-nowrap"
      >
        Gabung Mabar
      </a>
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <div className="sm:hidden flex items-center justify-center gap-2 bg-ink px-4 py-2 border-b border-snow/10">
      {LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`no-underline text-snow rounded-full px-4 py-2 font-sans font-semibold text-[13px] ${
              active ? "bg-snow/12" : ""
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
