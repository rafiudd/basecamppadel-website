"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { StaffRole } from "@/lib/accountRules";
import { MOBILE_NAV, isActive, navFor } from "./nav";

/** Phone tab bar, fixed to the bottom (hidden from md up, where the side menu shows). */
export function AdminBottomNav({ role }: { role: StaffRole }) {
  const pathname = usePathname();
  const navItems = navFor(role, MOBILE_NAV);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-indigo border-t border-snow/10 flex items-stretch"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {navItems.map((l) => {
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
