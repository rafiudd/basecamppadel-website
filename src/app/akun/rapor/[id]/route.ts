import { NextResponse, type NextRequest } from "next/server";
import { getAccount } from "@/lib/account";
import { loadCoaching } from "@/lib/profileData";
import { raporResponse } from "@/lib/rapor";

/**
 * D.6: the rapor of one of the player's own published assessments. Its <title> is the file name, so
 * "Save as PDF" gives BASECAMP_CLINIC_<NAME>_<D>_<MON>.pdf like the hand-made ones.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await getAccount();
  if (!user) return NextResponse.redirect(new URL(`/masuk?next=${encodeURIComponent("/akun?tab=catatan")}`, request.url));

  const playerId = profile?.player_id ?? null;
  const [{ skills, reports }, { data: player }] = await Promise.all([
    loadCoaching(supabase, playerId),
    playerId ? supabase.from("players").select("photo_url").eq("id", playerId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const report = reports.find((r) => r.id === id);
  if (!profile || !report) return new NextResponse("Rapor tidak ditemukan.", { status: 404 });
  // the player photo (the cut-out one the leaderboard shows), else the profile photo
  return raporResponse(profile.nickname, report, skills, reports, player?.photo_url || profile.photo_url || null);
}
