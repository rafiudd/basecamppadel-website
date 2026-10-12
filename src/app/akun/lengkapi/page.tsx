import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { ProfileSetupView } from "@/components/account/ProfileSetupView";
import { requireStep } from "@/lib/account";
import { safeNext } from "@/lib/accountRules";

export const metadata: Metadata = { title: "Lengkapi profil — Basecamp Padel", robots: { index: false } };

/** First stop after the first Google login. No skip: the account and event pages wait for it. */
export default async function LengkapiProfilPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const { user } = await requireStep("profile", next);

  return (
    <PublicShell>
      <ProfileSetupView email={user.email ?? ""} googleName={String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "")} next={next} />
    </PublicShell>
  );
}
