import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { accountStep } from "@/lib/accountRules";

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

/**
 * Gate for pages that need a finished account (the account page, event registration): sends the
 * visitor to sign in, fill in the profile, or answer "Ini saya?" first, then back to `path`.
 */
export async function requireAccount(path: string) {
  const account = await getAccount();
  const next = encodeURIComponent(path);
  if (!account.user) redirect(`/masuk?next=${next}`);
  if (account.step === "profile") redirect(`/akun/lengkapi?next=${next}`);
  if (account.step === "choose") redirect(`/akun/sambungkan?next=${next}`);
  return { ...account, user: account.user, profile: account.profile! };
}
