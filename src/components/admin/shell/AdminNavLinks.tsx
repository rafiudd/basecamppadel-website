"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV, isActive } from "./nav";

/** Desktop header menu. */
export function AdminNavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto min-w-0 max-w-full">
      {ADMIN_NAV.map((l) => {
        const on = isActive(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className={`no-underline text-snow rounded-full px-4 py-2 font-semibold text-sm flex-none whitespace-nowrap ${on ? "bg-snow/12" : "hover:bg-snow/8"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
