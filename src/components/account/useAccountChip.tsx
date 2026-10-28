"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { accountHome, googleIdentity, profilePhoto, staffRole } from "@/lib/accountRules";

/** `href`: where the nav chip goes, the admin area for an admin / coach, else the player profile. */
export type AccountChip = { name: string; photoUrl: string | null; href: string; isStaff: boolean };

const AccountChipContext = createContext<AccountChip | null | undefined>(undefined);

let cachedChip: AccountChip | null | undefined = undefined;
let inFlightFetch: Promise<AccountChip | null> | null = null;

export function clearAccountChipCache() {
  cachedChip = undefined;
  inFlightFetch = null;
}

/**
 * Reads the signed-in account once for the whole public shell (top nav + bottom tab bar), in the
 * browser so public pages stay static. Caches in memory to eliminate redundant requests across transitions.
 */
export function AccountChipProvider({ children }: { children: React.ReactNode }) {
  const [chip, setChip] = useState<AccountChip | null | undefined>(cachedChip);

  useEffect(() => {
    if (cachedChip !== undefined) {
      return;
    }

    let alive = true;

    if (!inFlightFetch) {
      inFlightFetch = fetch("/api/auth/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data?.user) {
            cachedChip = null;
            return null;
          }
          const user = data.user;
          const profile = data.profile;
          const role = staffRole(data.adminRow);
          const google = googleIdentity(user.user_metadata);
          const computed: AccountChip = {
            name: profile?.nickname ?? (google.name || user.email || "Akun").split(/\s+/)[0],
            photoUrl: profile ? profilePhoto(profile, google.avatarUrl) : google.avatarUrl,
            href: accountHome(role),
            isStaff: !!role,
          };
          cachedChip = computed;
          return computed;
        })
        .catch(() => {
          cachedChip = null;
          return null;
        })
        .finally(() => {
          inFlightFetch = null;
        });
    }

    inFlightFetch.then((res) => {
      if (alive) setChip(res);
    });

    return () => {
      alive = false;
    };
  }, []);

  return <AccountChipContext.Provider value={chip}>{children}</AccountChipContext.Provider>;
}

/** The signed-in account: `undefined` while loading, `null` when signed out. */
export function useAccountChip(): AccountChip | null | undefined {
  return useContext(AccountChipContext);
}
