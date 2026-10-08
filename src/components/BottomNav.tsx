"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WHATSAPP_URL } from "@/lib/config";

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
      {children}
    </svg>
  );
}

const HomeIcon = () => (
  <Icon>
    <path d="M4 10.5 12 4l8 6.5" />
    <path d="M6 9.5V20h12V9.5" />
    <path d="M10 20v-6h4v6" />
  </Icon>
);
const CalendarIcon = () => (
  <Icon>
    <rect x="4" y="5" width="16" height="15" rx="2.5" />
    <line x1="4" y1="10" x2="20" y2="10" />
    <line x1="8" y1="3" x2="8" y2="7" />
    <line x1="16" y1="3" x2="16" y2="7" />
  </Icon>
);
const TrophyIcon = () => (
  <Icon>
    <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
    <path d="M16 5h3v2a3 3 0 0 1-3 3" />
    <path d="M8 5H5v2a3 3 0 0 0 3 3" />
    <line x1="12" y1="13" x2="12" y2="17" />
    <path d="M8 20h8l-1-3H9z" />
  </Icon>
);
const ChatIcon = () => (
  <Icon>
    <path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.6 8.6 0 0 1-3.6-.8L3 20l1-5.3a8.4 8.4 0 0 1-.9-3.8A8.4 8.4 0 0 1 12.1 3a8.4 8.4 0 0 1 8.9 8.5z" />
  </Icon>
);

const LINKS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/jadwal", label: "Jadwal", icon: CalendarIcon },
  { href: "/leaderboard", label: "Leaderboard", icon: TrophyIcon },
];

/** Phone tab bar, fixed to the bottom (hidden from md up, where the top nav's links show instead). */
export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-ink border-t border-snow/10 flex items-stretch"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {LINKS.map((l) => {
        const on = isActive(l.href);
        const Ico = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 no-underline transition-colors active:scale-95 ${on ? "text-coral" : "text-snow/60"}`}
          >
            <Ico />
            <span className="text-2xs font-semibold">{l.label}</span>
          </Link>
        );
      })}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener"
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 no-underline text-coral transition-transform active:scale-95"
      >
        <ChatIcon />
        <span className="text-2xs font-bold">Gabung</span>
      </a>
    </nav>
  );
}
