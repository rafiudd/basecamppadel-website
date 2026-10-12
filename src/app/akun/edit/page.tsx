import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { ProfileEditView } from "@/components/account/ProfileEditView";
import { isCategoryLocked, requireAccount } from "@/lib/account";

export const metadata: Metadata = { title: "Edit profil — Basecamp Padel", robots: { index: false } };

export default async function EditProfilPage() {
  const { supabase, user, profile } = await requireAccount("/akun/edit");

  return (
    <PublicShell>
      <ProfileEditView
        profile={profile}
        email={profile.email || user.email || ""}
        backHref="/akun"
        categoryLocked={await isCategoryLocked(supabase, profile.player_id)}
      />
    </PublicShell>
  );
}
