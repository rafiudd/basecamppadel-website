"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { UserIcon } from "@/components/ui/icons";
import { SignOutForm } from "./SignOutForm";

/** Mobile header account button: email, link to the public site, sign out. */
export function AdminAccountMenu({ email, isAdmin }: { email: string; isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu akun"
        aria-expanded={open}
        className="w-11 h-11 rounded-full bg-snow/10 text-snow flex items-center justify-center border-none p-0"
      >
        <UserIcon />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-65 bg-ink-3 border border-snow/12 rounded-card p-2 shadow-pop flex flex-col gap-0.5">
          <div className="px-3 py-2 text-caption text-snow/65 break-all border-b border-snow/8 mb-1">{email}</div>
          {isAdmin && (
            <>
              <div className="px-3 pt-1 text-2xs uppercase tracking-wider font-semibold text-snow/40">User Management</div>
              <Link href="/admin/users/admin" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-sm text-snow no-underline hover:bg-snow/8">
                Admin
              </Link>
              <Link href="/admin/users/scorekeeper" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-sm text-snow no-underline hover:bg-snow/8">
                Score Keeper
              </Link>
              <Link href="/admin/users/coach" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-sm text-snow no-underline hover:bg-snow/8">
                Coach
              </Link>
              <div className="my-1 border-b border-snow/8" />
            </>
          )}
          <Link href="/" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-sm text-snow/80 no-underline hover:bg-snow/8">
            Lihat situs ↗
          </Link>
          <SignOutForm className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-coral bg-transparent border-none hover:bg-snow/8" />
        </div>
      )}
    </div>
  );
}
