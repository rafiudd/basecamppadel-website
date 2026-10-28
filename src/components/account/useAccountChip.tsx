"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { accountHome, googleIdentity, profilePhoto, staffRole } from "@/lib/accountRules";

/** `href`: where the nav chip goes, the admin area for an admin / coach, else the player profile. */
export type AccountChip = { name: string; photoUrl: string | null; href: string; isStaff: boolean };

const AccountChipContext = createContext<AccountChip | null | undefined>(undefined);

/*
 * Module-level store: every page and loading.tsx renders its own PublicShell, so the provider remounts
 * on each navigation. Keeping the chip here (it lives as long as the tab, until a full reload) lets the
 * new nav paint the known account instantly instead of blinking empty while /api/auth/me reloads.
 */
let chipCache: AccountChip | null | undefined = undefined;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setChip(next: AccountChip | null) {
  // Same account → keep the old object so nothing re-renders.
  if (JSON.stringify(next) === JSON.stringify(chipCache)) return;
  chipCache = next;
  listeners.forEach((l) => l());
}

async function fetchChip(): Promise<AccountChip | null> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  const data = res.ok ? await res.json() : null;
  if (!data?.user) return null;
  const user = data.user;
  const profile = data.profile;
  // a deactivated staff account is just a player account here
  const role = staffRole(data.adminRow);
  const google = googleIdentity(user.user_metadata);
  return {
    name: profile?.nickname ?? (google.name || user.email || "Akun").split(/\s+/)[0],
    photoUrl: profile ? profilePhoto(profile, google.avatarUrl) : google.avatarUrl,
    href: accountHome(role),
    isStaff: !!role,
  };
}

/** Re-checks the session in the background; concurrent callers (loading.tsx + page) share one request. */
function revalidateChip() {
  inflight ??= fetchChip()
    .then(setChip)
    .catch(() => {
      // keep showing a known account on a network blip; only a first load falls back to signed out
      if (chipCache === undefined) setChip(null);
    })
    .finally(() => {
      inflight = null;
    });
}

/**
 * Reads the signed-in account for the whole public shell (top nav + bottom tab bar), in the browser
 * so public pages stay static. Shows the last known account right away and re-checks on every mount,
 * so a sign-out, account delete or profile edit (all soft navigations) still shows up.
 */
export function AccountChipProvider({ children }: { children: React.ReactNode }) {
  const chip = useSyncExternalStore(subscribe, () => chipCache, () => undefined);

  useEffect(revalidateChip, []);

  return <AccountChipContext.Provider value={chip}>{children}</AccountChipContext.Provider>;
}

/** The signed-in account: `undefined` while loading, `null` when signed out. */
export function useAccountChip(): AccountChip | null | undefined {
  return useContext(AccountChipContext);
}
