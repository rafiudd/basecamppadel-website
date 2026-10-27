"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MountainMark } from "./Logo";
import { WHATSAPP_URL } from "@/lib/config";
import { Avatar } from "./ui/Avatar";
import { useAccountChip } from "./account/useAccountChip";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/jadwal", label: "Jadwal" },
  { href: "/liga", label: "Liga" },
  { href: "/kelas", label: "Kelas" },
  { href: "/leaderboard", label: "Leaderboard" },
];


export function Nav() {
  const pathname = usePathname();
  const account = useAccountChip();

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

        <div className="flex items-center gap-4">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener"
            className="no-underline bg-coral text-ink font-sans font-bold text-sm px-[22px] py-3 rounded-full whitespace-nowrap transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Gabung Mabar
          </a>
          {account ? (
            <Link
              href={account.href}
              title={account.isStaff ? "Buka halaman admin" : undefined}
              aria-current={!account.isStaff && pathname.startsWith("/akun") ? "page" : undefined}
              className="flex items-center gap-2.5 no-underline text-snow font-semibold text-sm hover:text-volt"
            >
              <Avatar name={account.name} photoUrl={account.photoUrl} size={36} />
              <span className="max-w-30 truncate">{account.name}</span>
            </Link>
          ) : (
            <Link
              href={`/masuk?next=${encodeURIComponent(pathname)}`}
              className={`no-underline text-snow font-semibold text-sm rounded-full px-[18px] py-2.5 border border-snow/25 hover:border-volt hover:text-volt whitespace-nowrap ${
                account === undefined ? "invisible" : ""
              }`}
            >
              Masuk
            </Link>
          )}
        </div>
      </nav>


      {/* Mobile top bar: Logo on left, Account profile picture on right */}
      <nav
        className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 box-content bg-ink border-b border-snow/10"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <Link href="/" className="flex items-center gap-2 no-underline">
          <MountainMark size={26} />
          <div className="font-display font-bold text-sm leading-none text-snow">
            BASECAMP <span className="text-coral">PADEL</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={account?.href ?? (account === null ? `/masuk?next=${encodeURIComponent(pathname)}` : "/akun")}
            title={account?.isStaff ? "Buka halaman admin" : "Akun saya"}
            aria-label="Akun"
            className={`relative flex items-center justify-center w-8 h-8 rounded-full no-underline transition-transform active:scale-95 ${
              pathname.startsWith("/akun") || pathname.startsWith("/masuk") || Boolean(account?.isStaff && pathname.startsWith("/admin"))
                ? "ring-2 ring-coral"
                : "ring-1 ring-snow/20 hover:ring-snow/40"
            }`}
          >
            {account?.name ? (
              <Avatar name={account.name} photoUrl={account.photoUrl} size={32} />
            ) : (
              <span className="w-full h-full rounded-full bg-snow/10 flex items-center justify-center text-snow/75">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
              </span>
            )}
          </Link>
        </div>
      </nav>
    </>
  );
}

export function MobileNav() {
  return null;
}

