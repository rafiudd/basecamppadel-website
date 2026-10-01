"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const LINKS = [
  {
    href: "/admin/events",
    label: "Event",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </svg>
    ),
  },
  {
    href: "/admin/live",
    label: "Live",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/admin/points",
    label: "Poin",
    icon: (
      <svg {...iconProps}>
        <path d="M12 3v18M3 12h18" />
        <circle cx="12" cy="12" r="7" />
      </svg>
    ),
  },
  {
    href: "/admin/players",
    label: "Pemain",
    icon: (
      <svg {...iconProps}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <circle cx="17.5" cy="9" r="2.3" />
        <path d="M16 14.2c2.6.4 4.5 2.6 4.5 5.3" />
      </svg>
    ),
  },
  {
    href: "/admin/venues",
    label: "Venue",
    icon: (
      <svg {...iconProps}>
        <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
];

export function AdminBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-indigo border-t border-snow/10 flex items-stretch"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {LINKS.map((l) => {
        const active = pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 no-underline ${
              active ? "text-volt" : "text-snow/55"
            }`}
          >
            {l.icon}
            <span className="text-[11px] font-semibold">{l.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
