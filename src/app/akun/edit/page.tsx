import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { ProfileForm } from "@/components/account/ProfileForm";
import { requireAccount } from "@/lib/account";
import { formatWhatsapp } from "@/lib/accountRules";

export const metadata: Metadata = { title: "Edit profil — Basecamp Padel", robots: { index: false } };

export default async function EditProfilPage() {
  const { supabase, user, profile } = await requireAccount("/akun/edit");

  // once the player has points, only an admin changes their gender (the database checks this too)
  let genderLocked = false;
  if (profile.player_id) {
    const [{ data: player }, { count }] = await Promise.all([
      supabase.from("players").select("points").eq("id", profile.player_id).maybeSingle(),
      supabase.from("match_history").select("id", { count: "exact", head: true }).eq("player_id", profile.player_id),
    ]);
    genderLocked = (player?.points ?? 0) !== 0 || (count ?? 0) > 0;
  }

  return (
    <PublicShell>
      <div className="px-4 md:px-12 pt-8 pb-14 md:pt-12 md:pb-18">
        <div className="max-w-190 mx-auto flex flex-col gap-6 text-ink">
          <div>
            <Link href="/akun" className="no-underline text-sm font-semibold text-ink/60 hover:text-indigo">
              ← Akun
            </Link>
            <h1 className="font-display font-bold text-[30px] md:text-[40px] leading-[1.05] mt-2 mb-0">Edit profil</h1>
            <p className="mt-2 mb-0 text-base text-ink/70">Email mengikuti akun Google dan tidak bisa diubah.</p>
          </div>
          <ProfileForm
            mode="edit"
            next="/akun"
            email={profile.email || user.email || ""}
            googleName={profile.full_name}
            genderLocked={genderLocked}
            defaults={{
              nickname: profile.nickname,
              gender: profile.gender,
              whatsapp: formatWhatsapp(profile.whatsapp),
              region: profile.region,
              hand: profile.dominant_hand ?? "",
              position: profile.position ?? "",
              photoUrl: profile.photo_url,
            }}
          />
        </div>
      </div>
    </PublicShell>
  );
}
