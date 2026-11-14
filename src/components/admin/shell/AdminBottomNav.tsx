"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DotsHorizontalIcon } from "@/components/ui/icons";
import type { StaffRole } from "@/lib/accountRules";
import { MOBILE_NAV, MOBILE_NAV_MORE, isActive, navFor } from "./nav";

/** Phone tab bar, fixed to the bottom (hidden from md up, where the side menu shows). */
export function AdminBottomNav({ role }: { role: StaffRole }) {
  const pathname = usePathname();
  const navItems = navFor(role, MOBILE_NAV);
  const moreItems = navFor(role, MOBILE_NAV_MORE);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const moreOn = moreItems.some((l) => isActive(pathname, l.href));

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

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

      {moreItems.length > 0 && (
        <div ref={ref} className="relative flex-1 flex">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu lainnya"
            aria-expanded={open}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 border-none bg-transparent ${moreOn || open ? "text-volt" : "text-snow/65"}`}
          >
            <DotsHorizontalIcon />
            <span className="text-2xs font-semibold">Lainnya</span>
          </button>

          {open && (
            <div className="absolute right-2 bottom-full mb-2 z-50 w-48 bg-ink-3 border border-snow/12 rounded-card p-2 shadow-pop flex flex-col gap-0.5">
              {moreItems.map((l) => {
                const on = isActive(pathname, l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={on ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm no-underline hover:bg-snow/8 ${on ? "text-volt" : "text-snow"}`}
                  >
                    {l.icon}
                    {l.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
