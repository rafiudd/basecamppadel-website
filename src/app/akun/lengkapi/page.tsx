import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { ProfileForm } from "@/components/account/ProfileForm";
import { getAccount } from "@/lib/account";
import { safeNext } from "@/lib/accountRules";

export const metadata: Metadata = { title: "Lengkapi profil — Basecamp Padel", robots: { index: false } };

/** First stop after the first Google login. No skip: the account and event pages wait for it. */
export default async function LengkapiProfilPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const { user, step } = await getAccount();
  if (!user) redirect(`/masuk?next=${encodeURIComponent(next)}`);
  if (step === "choose") redirect(`/akun/sambungkan?next=${encodeURIComponent(next)}`);
  if (step === "ready") redirect(next);

  const googleName = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "");

  return (
    <PublicShell>
      <div className="px-4 md:px-12 pt-8 pb-14 md:pt-12 md:pb-18">
        <div className="max-w-190 mx-auto flex flex-col gap-6 text-ink">
          <div>
            <h1 className="font-display font-bold text-[30px] md:text-[40px] leading-[1.05] m-0">Lengkapi profil kamu</h1>
            <p className="mt-2 mb-0 text-base text-ink/70">
              Sekali aja sebelum mulai. Biar coach &amp; panitia kenal kamu, dan bisa diubah kapan aja.
            </p>
          </div>
          <ProfileForm
            mode="setup"
            next={next}
            email={user.email ?? ""}
            googleName={googleName}
            defaults={{
              nickname: googleName.split(/\s+/)[0] ?? "",
              gender: "",
              whatsapp: "",
              region: "",
              hand: "",
              position: "",
              photoUrl: null,
            }}
          />
        </div>
      </div>
    </PublicShell>
  );
}
