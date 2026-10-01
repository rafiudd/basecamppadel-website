"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/events", label: "Event" },
  { href: "/admin/live", label: "Live" },
  { href: "/admin/points", label: "Poin" },
  { href: "/admin/players", label: "Pemain" },
  { href: "/admin/venues", label: "Venue" },
];

export function AdminNavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto min-w-0 max-w-full">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`no-underline text-snow rounded-full px-4 py-2 font-semibold text-sm flex-none whitespace-nowrap ${
            pathname.startsWith(l.href) ? "bg-snow/12" : "hover:bg-snow/8"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
