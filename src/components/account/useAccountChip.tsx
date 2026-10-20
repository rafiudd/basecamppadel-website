"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { accountHome, googleIdentity, profilePhoto } from "@/lib/accountRules";

/** `href`: where the nav chip goes, the admin area for an admin / coach, else the player profile. */
export type AccountChip = { name: string; photoUrl: string | null; href: string; isStaff: boolean };

const AccountChipContext = createContext<AccountChip | null | undefined>(undefined);

/**
 * Reads the signed-in account once for the whole public shell (top nav + bottom tab bar), in the
 * browser so public pages stay static.
 */
export function AccountChipProvider({ children }: { children: React.ReactNode }) {
  const [chip, setChip] = useState<AccountChip | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!alive) return;
        if (!data?.user) {
          setChip(null);
          return;
        }
        const user = data.user;
        const profile = data.profile;
        const staff = data.adminRow;
        const google = googleIdentity(user.user_metadata);
        setChip({
          name: profile?.nickname ?? (google.name || user.email || "Akun").split(/\s+/)[0],
          photoUrl: profile ? profilePhoto(profile, google.avatarUrl) : google.avatarUrl,
          href: accountHome(staff?.role),
          isStaff: !!staff,
        });
      })
      .catch(() => {
        if (alive) setChip(null);
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
