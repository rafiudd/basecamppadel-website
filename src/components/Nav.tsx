"use client";

import { useState } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);

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


      {/* Mobile Nav */}
      <nav className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-6 h-[64px] bg-ink border-b border-snow/10">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <MountainMark size={30} />
          <div className="font-display font-bold text-[15px] leading-[1.1] text-snow">
            BASECAMP
            <br />
            <span className="text-coral">PADEL</span>
          </div>
        </Link>

        <div className="flex items-center gap-1.5">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener"
            className="no-underline bg-coral text-ink font-sans font-bold text-[13px] px-4 py-2 rounded-full whitespace-nowrap"
          >
            Gabung Mabar
          </a>
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="w-11 h-11 flex items-center justify-center text-snow bg-transparent border-0 cursor-pointer"
          >
            {menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="absolute left-0 right-0 top-[64px] bg-ink border-b border-snow/10 flex flex-col py-2 shadow-2xl animate-in slide-in-from-top-2 duration-200">
            {LINKS.map((l) => {
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className={`no-underline text-snow px-6 py-3.5 font-sans font-semibold text-base transition-colors ${
                    active
                      ? "bg-snow/8 border-l-[3px] border-coral"
                      : "bg-transparent border-l-[3px] border-transparent hover:bg-snow/5"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </>
  );
}

export function MobileNav() {
  return null;
}

