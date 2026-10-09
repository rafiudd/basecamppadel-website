"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type AccountChip = { name: string; photoUrl: string | null };

/**
 * The signed-in player for the public nav, read in the browser so public pages stay static.
 * `undefined` while loading, `null` when signed out.
 */
export function useAccountChip(): AccountChip | null | undefined {
  const [chip, setChip] = useState<AccountChip | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (!user) return void setChip(null);
      // supabase calls inside this callback would deadlock the auth lock, so defer them
      setTimeout(async () => {
        const { data: profile } = await supabase.from("profiles").select("nickname, photo_url").eq("user_id", user.id).maybeSingle();
        if (!alive) return;
        setChip({
          name: profile?.nickname ?? String(user.user_metadata?.full_name ?? user.email ?? "Akun").split(/\s+/)[0],
          photoUrl: profile?.photo_url ?? null,
        });
      }, 0);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return chip;
}
