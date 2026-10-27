"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { StaffRole } from "@/lib/accountRules";
import { ADMIN_NAV_GROUPS, isActive, navFor } from "./nav";

/** Desktop side menu: the groups with only the items this role may open (no heading when one is left). */
export function AdminSideNav({ role }: { role: StaffRole }) {
  const pathname = usePathname();
  const groups = ADMIN_NAV_GROUPS.map((g) => ({ ...g, items: navFor(role, g.items) })).filter((g) => g.items.length);

  return (
    <nav aria-label="Menu admin" className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g.label} className="flex flex-col gap-0.5">
          {groups.length > 1 && <div className="px-3 pb-1.5 text-2xs font-bold tracking-caps uppercase text-snow/45">{g.label}</div>}
          {g.items.map((l) => {
            const on = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={on ? "page" : undefined}
                className={`no-underline flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${on ? "bg-snow/12 text-volt" : "text-snow/80 hover:bg-snow/8 hover:text-snow"}`}
              >
                {l.icon}
                <span className="truncate">{l.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
