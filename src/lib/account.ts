import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { accountStep, stepPath } from "@/lib/accountRules";
import type { Supa } from "@/lib/server/action";

/** The signed-in player (if any), their profile row, and how far account setup got. */
export async function getAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null, step: null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  return { supabase, user, profile, step: accountStep(profile) };
}

/** Pages of one setup step (Lengkapi, Sambungkan): anyone at another step is sent where they belong. */
export async function requireStep(step: "profile" | "choose", next: string) {
  const account = await getAccount();
  if (account.step !== step) redirect(stepPath(account.step, next));
  return { ...account, user: account.user! };
}

/**
 * Gate for pages that need a finished account (the account page, event registration): sends the
 * visitor to sign in, fill in the profile, or answer "Ini saya?" first, then back to `path`.
 */
export async function requireAccount(path: string) {
  const account = await getAccount();
  if (account.step !== "ready") redirect(stepPath(account.step, path));
  return { ...account, user: account.user!, profile: account.profile! };
}

/** Once the player has points or matches, only an admin changes their category (the database checks this too). */
export async function isCategoryLocked(supabase: Supa, playerId: string | null): Promise<boolean> {
  if (!playerId) return false;
  const [{ data: player }, { count }] = await Promise.all([
    supabase.from("players").select("points").eq("id", playerId).maybeSingle(),
    supabase.from("match_history").select("id", { count: "exact", head: true }).eq("player_id", playerId),
  ]);
  return (player?.points ?? 0) !== 0 || (count ?? 0) > 0;
}
