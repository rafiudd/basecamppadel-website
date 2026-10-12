import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/ActionForm";
import { ProfileView, SignOutLabel, parseTab, signOutButton } from "@/components/account/profile/ProfileView";
import { signOut } from "@/app/akun/actions";
import { requireAccount } from "@/lib/account";
import { loadCoaching, loadEventHistory } from "@/lib/profileData";

export const metadata: Metadata = { title: "Profil saya — Basecamp Padel", robots: { index: false } };

export default async function AkunPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; coach?: string; year?: string; tersambung?: string }>;
}) {
  const params = await searchParams;
  const { supabase, profile } = await requireAccount("/akun");

  const [{ data: player }, { data: claimed }, reports, history] = await Promise.all([
    profile.player_id
      ? supabase.from("players").select("wins, losses").eq("id", profile.player_id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile.claim_player_id
      ? supabase.from("players").select("name").eq("id", profile.claim_player_id).maybeSingle()
      : Promise.resolve({ data: null }),
    loadCoaching(supabase, profile.player_id),
    loadEventHistory(supabase, profile.player_id),
  ]);

  return (
    <ProfileView
      profile={profile}
      tab={parseTab(params.tab)}
      coach={params.coach}
      year={params.year}
      tersambung={!!params.tersambung}
      claimedName={claimed?.name}
      reports={reports}
      history={history}
      wins={player?.wins ?? 0}
      losses={player?.losses ?? 0}
      basePath="/akun"
      signOut={
        // A.5: sign out sits in the header; deleting the account lives on Edit profil
        <ActionForm action={signOut} successText={false}>
          <button type="submit" className={signOutButton}>
            <SignOutLabel />
          </button>
        </ActionForm>
      }
    />
  );
}
