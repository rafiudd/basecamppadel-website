"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
    const supabase = createClient();
    let alive = true;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (!user) return void setChip(null);
      // supabase calls inside this callback would deadlock the auth lock, so defer them
      setTimeout(async () => {
        const [{ data: profile }, { data: staff }] = await Promise.all([
          supabase.from("profiles").select("nickname, photo_url, photo_source").eq("user_id", user.id).maybeSingle(),
          // RLS lets a user read only their own admin_users row; players have none
          supabase.from("admin_users").select("role").eq("user_id", user.id).maybeSingle(),
        ]);
        if (!alive) return;
        const google = googleIdentity(user.user_metadata);
        setChip({
          name: profile?.nickname ?? (google.name || user.email || "Akun").split(/\s+/)[0],
          // same rule as the profile header: saved photo, none if removed on purpose, else the Google picture
          photoUrl: profile ? profilePhoto(profile, google.avatarUrl) : google.avatarUrl,
          href: accountHome(staff?.role),
          isStaff: !!staff,
        });
      }, 0);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return <AccountChipContext.Provider value={chip}>{children}</AccountChipContext.Provider>;
}

/** The signed-in account: `undefined` while loading, `null` when signed out. */
export function useAccountChip(): AccountChip | null | undefined {
  return useContext(AccountChipContext);
}
