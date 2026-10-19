import type { Metadata } from "next";
import { ProfileView, parseTab, type ProfileLevel } from "@/components/account/profile/ProfileView";
import { signOut } from "@/app/akun/actions";
import { requireAccount } from "@/lib/account";
import { googleIdentity } from "@/lib/accountRules";
import { LEVEL_DEFINITIONS, type PlayerLevelName } from "@/lib/coaching";
import { loadCoaching, loadEventHistory, loadNextCoachingSession } from "@/lib/profileData";

export const metadata: Metadata = { title: "Profil saya — Basecamp Padel", robots: { index: false } };

/**
 * The coaching level for the header badge: shown once the player has a published assessment (or an
 * admin set it). The color follows the level definition; the stored level_color is only a fallback.
 */
function profileLevel(
  player: { level: string; level_color?: string; level_overridden?: boolean } | null,
  assessed: boolean,
): ProfileLevel | null {
  if (!player?.level || !(assessed || player.level_overridden)) return null;
  const color = LEVEL_DEFINITIONS[player.level as PlayerLevelName]?.color ?? player.level_color;
  return color ? { name: player.level, color } : null;
}

export default async function AkunPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; coach?: string; year?: string; tersambung?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user, profile } = await requireAccount("/akun");
  const googleAvatar = googleIdentity(user.user_metadata).avatarUrl;

  const [{ data: player }, { data: claimed }, { skills, reports }, history, nextSession] = await Promise.all([
    profile.player_id
      ? supabase.from("players").select("name, points, wins, losses, level, level_color, level_overridden").eq("id", profile.player_id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile.claim_player_id
      ? supabase.from("players").select("name").eq("id", profile.claim_player_id).maybeSingle()
      : Promise.resolve({ data: null }),
    loadCoaching(supabase, profile.player_id),
    loadEventHistory(supabase, profile.player_id),
    loadNextCoachingSession(supabase),
  ]);

  return (
    <ProfileView
      profile={profile}
      googleAvatar={googleAvatar}
      tab={parseTab(params.tab)}
      coach={params.coach}
      year={params.year}
      tersambung={!!params.tersambung}
      claimedName={claimed?.name}
      skills={skills}
      reports={reports}
      level={profileLevel(player, reports.length > 0)}
      history={history}
      nextSession={nextSession}
      points={player?.points ?? 0}
      playerName={player?.name}
      wins={player?.wins ?? 0}
      losses={player?.losses ?? 0}
      basePath="/akun"
      signOutAction={signOut}
    />
  );
}
