import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/auth";
import { loadSkills } from "@/lib/profileData";
import { splitNotes, type CoachReport } from "@/lib/coachingRules";
import { raporResponse } from "@/lib/rapor";

/**
 * Admin/coach view of any player's rapor — the player-facing /akun/rapor route only shows your own,
 * and only once it's published. This one works for any submitted assessment regardless of
 * `published_to_player`, so a coach can preview the PDF before deciding to publish it.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // coaching_assessments.id
  const { user, isAdmin, isCoach } = await getAdminUser();
  if (!user) return NextResponse.redirect(new URL(`/admin/login?next=${encodeURIComponent(request.nextUrl.pathname)}`, request.url));
  if (!isAdmin && !isCoach) return NextResponse.redirect(new URL("/", request.url));

  const supabase = await createClient();
  const { data: a } = await supabase
    .from("coaching_assessments")
    .select("id, session_id, coach_id, player_id, scores, evaluation, next_practice, status")
    .eq("id", id)
    .maybeSingle();
  if (!a || a.status !== "submitted") return new NextResponse("Rapor tidak ditemukan.", { status: 404 });

  const [{ data: player }, { data: session }, { data: coach }, skills] = await Promise.all([
    supabase.from("players").select("name").eq("id", a.player_id).maybeSingle(),
    supabase.from("coaching_sessions").select("id, title, session_date, venue_name, event_id").eq("id", a.session_id).maybeSingle(),
    a.coach_id ? supabase.from("coaches").select("name").eq("id", a.coach_id).maybeSingle() : Promise.resolve({ data: null }),
    loadSkills(supabase),
  ]);
  if (!player || !session) return new NextResponse("Rapor tidak ditemukan.", { status: 404 });

  const known = new Set(skills.map((s) => s.key));
  const report: CoachReport = {
    id: a.id,
    session: { id: session.id, title: session.title, session_date: session.session_date, venue: session.venue_name, coach_name: coach?.name || "", event_id: session.event_id },
    evaluation: splitNotes(a.evaluation),
    next_practice: splitNotes(a.next_practice),
    ratings: Object.entries(a.scores ?? {}).flatMap(([skill_key, score]) =>
      known.has(skill_key) && Number(score) > 0 ? [{ skill_key, score: Number(score) }] : [],
    ),
  };

  return raporResponse(player.name, report, skills);
}
