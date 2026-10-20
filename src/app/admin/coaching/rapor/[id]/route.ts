import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadCoaching } from "@/lib/profileData";
import { raporResponse } from "@/lib/rapor";

/**
 * D.6 for admin and coach: the rapor of any submitted assessment, also before it is sent to the
 * player. Same page as the player's /akun/rapor, compared with the player's previous submitted one.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, isCoach } = await getAdminUser();
  if (!user) return NextResponse.redirect(new URL("/admin/login", request.url));
  if (!isCoach) return new NextResponse("Tidak punya akses.", { status: 403 });

  const supabase = await createClient();
  const { data: row } = await supabase.from("coaching_assessments").select("player_id").eq("id", id).maybeSingle();
  if (!row) return new NextResponse("Rapor tidak ditemukan.", { status: 404 });

  const [{ skills, reports }, { data: player }] = await Promise.all([
    loadCoaching(supabase, row.player_id, { publishedOnly: false }),
    supabase.from("players").select("name, photo_url").eq("id", row.player_id).maybeSingle(),
  ]);
  const report = reports.find((r) => r.id === id);
  if (!player || !report) return new NextResponse("Rapor belum dikirim (masih draft).", { status: 404 });
  return raporResponse(player.name, report, skills, reports, player.photo_url ?? null);
}
