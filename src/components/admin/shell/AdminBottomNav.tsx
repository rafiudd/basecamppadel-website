"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV, isActive } from "./nav";

const MOBILE_NAV = [...ADMIN_NAV].sort((a, b) => a.mobileOrder - b.mobileOrder);

/** Phone tab bar, fixed to the bottom (hidden from md up, where the header menu shows). */
export function AdminBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-indigo border-t border-snow/10 flex items-stretch"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {MOBILE_NAV.map((l) => {
        const on = isActive(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 no-underline ${on ? "text-volt" : "text-snow/65"}`}
          >
            {l.icon}
            <span className="text-2xs font-semibold">{l.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
