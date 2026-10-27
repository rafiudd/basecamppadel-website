"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
      {children}
    </svg>
  );
}

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
const ShieldIcon = () => (
  <Icon>
    <path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z" />
  </Icon>
);

const AcademicCapIcon = () => (
  <Icon>
    <path d="M2 9l10-5 10 5-10 5z" />
    <path d="M6 11v5c0 1.6 2.7 3 6 3s6-1.4 6-3v-5" />
    <line x1="22" y1="9" x2="22" y2="14" />
  </Icon>
);

const LINKS = [
  { href: "/jadwal", label: "Jadwal", icon: CalendarIcon },
  { href: "/liga", label: "Liga", icon: ShieldIcon },
  { href: "/kelas", label: "Kelas", icon: AcademicCapIcon },
  { href: "/leaderboard", label: "Leaderboard", icon: TrophyIcon },
];

/** Phone tab bar, fixed to the bottom (hidden from md up, where the top nav's links show instead). */
export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname.startsWith(href);

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
            className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-2.5 px-2 no-underline transition-colors active:scale-95 ${
              on ? "text-coral" : "text-snow/60 hover:text-snow/80"
            }`}
          >
            <Ico />
            <span className={`w-full text-2xs text-center truncate ${on ? "font-bold" : "font-medium"}`}>
              {l.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
