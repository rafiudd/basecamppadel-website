import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { getAdminUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BrandMark } from "@/lib/brandMark";
import { parseDateParts } from "@/lib/format";

export const runtime = "nodejs";

/** "Pembagian Grup" poster for a real coaching session — downloadable PNG built from the session's
 *  actual groups/coach/roster, so there's nothing to type in by hand. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  const { user, isAdmin, isCoach } = await getAdminUser();
  if (!user) return NextResponse.redirect(new URL(`/admin/login?next=${encodeURIComponent(request.nextUrl.pathname)}`, request.url));
  if (!isAdmin && !isCoach) return NextResponse.redirect(new URL("/", request.url));

  const supabase = await createClient();
  const { data: session } = await supabase.from("coaching_sessions").select("id, title, session_date").eq("id", sessionId).maybeSingle();
  if (!session) return new NextResponse("Sesi tidak ditemukan.", { status: 404 });

  const [{ data: groups }, { data: rosterRows }] = await Promise.all([
    supabase.from("coaching_groups").select("id, name, color, coach_id").eq("session_id", sessionId).order("created_at"),
    supabase.from("coaching_session_players").select("group_id, player_id").eq("session_id", sessionId),
  ]);

  const playerIds = [...new Set((rosterRows ?? []).map((r) => r.player_id))];
  const coachIds = [...new Set((groups ?? []).map((g) => g.coach_id).filter((id): id is string => !!id))];
  const [{ data: players }, { data: coaches }] = await Promise.all([
    playerIds.length ? supabase.from("players").select("id, name").in("id", playerIds) : Promise.resolve({ data: [] }),
    coachIds.length ? supabase.from("coaches").select("id, name").in("id", coachIds) : Promise.resolve({ data: [] }),
  ]);
  const playerName = new Map((players ?? []).map((p) => [p.id, p.name]));
  const coachName = new Map((coaches ?? []).map((c) => [c.id, c.name]));

  const groupCards = (groups ?? []).map((g) => ({
    name: g.name,
    color: g.color || "#FFD43B",
    coach: g.coach_id ? coachName.get(g.coach_id) || "" : "",
    players: (rosterRows ?? []).filter((r) => r.group_id === g.id).map((r) => playerName.get(r.player_id) || "?"),
  }));
  const ungrouped = (rosterRows ?? []).filter((r) => !r.group_id).map((r) => playerName.get(r.player_id) || "?");
  if (ungrouped.length) groupCards.push({ name: "Belum ada grup", color: "#8B8A99", coach: "", players: ungrouped });

  if (groupCards.length === 0) return new NextResponse("Sesi ini belum punya grup/peserta.", { status: 400 });

  const [displayBold, textSemibold] = await Promise.all([
    readFile(join(process.cwd(), "src/fonts/space-grotesk-latin-700-normal.woff")),
    readFile(join(process.cwd(), "src/fonts/inter-latin-600-normal.woff")),
  ]);

  const dateLabel = parseDateParts(session.session_date).dateFormatted;
  const maxPlayersInAGroup = Math.max(...groupCards.map((g) => g.players.length));
  const height = Math.min(2200, Math.max(1350, 620 + Math.ceil(groupCards.length / 2) * (170 + maxPlayersInAGroup * 60)));

  const image = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#1B1650", color: "#FBF7F1", fontFamily: "Inter", padding: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BrandMark size={34} />
          <div style={{ display: "flex", fontFamily: "Space Grotesk", fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>
            <span>BASECAMP&nbsp;</span>
            <span style={{ color: "#FF5A3C" }}>PADEL</span>
          </div>
        </div>

        <div style={{ display: "flex", fontFamily: "Space Grotesk", fontSize: 72, fontWeight: 700, marginTop: 48, lineHeight: 1 }}>
          <span>Pembagian&nbsp;</span>
          <span style={{ color: "#FF5A3C" }}>Grup</span>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
          <div style={{ display: "flex", border: "2px solid #FFD43B", color: "#FFD43B", borderRadius: 999, padding: "10px 22px", fontSize: 18, fontWeight: 700 }}>
            {session.title}
          </div>
          <div style={{ display: "flex", background: "#FFD43B", color: "#1B1650", borderRadius: 999, padding: "10px 22px", fontSize: 18, fontWeight: 700 }}>
            {dateLabel}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginTop: 44 }}>
          {groupCards.map((g, i) => {
            const width = groupCards.length === 1 ? "100%" : "calc(50% - 12px)";
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", width, borderRadius: 24, overflow: "hidden" }}>
                <div style={{ display: "flex", flexDirection: "column", background: g.color, padding: "22px 26px" }}>
                  <span style={{ fontFamily: "Space Grotesk", fontSize: 30, fontWeight: 700, color: "#1B1650" }}>{g.name}</span>
                  {g.coach && <span style={{ fontSize: 16, fontWeight: 600, color: "rgba(27,22,80,0.75)", marginTop: 2 }}>Coach {g.coach}</span>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", background: "#FBF7F1" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "10px 26px", borderBottom: "1px solid rgba(27,22,80,0.12)" }}>
                    <span style={{ fontSize: 14, color: "rgba(27,22,80,0.55)" }}>{g.players.length} orang</span>
                  </div>
                  {g.players.map((p, pi) => (
                    <div
                      key={pi}
                      style={{ display: "flex", padding: "16px 26px", borderBottom: pi < g.players.length - 1 ? "1px solid rgba(27,22,80,0.08)" : "none" }}
                    >
                      <span style={{ fontFamily: "Space Grotesk", fontSize: 26, fontWeight: 700, color: "#1B1650" }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              border: "1px solid rgba(251,247,241,0.25)",
              borderRadius: 999,
              padding: "14px 24px",
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 600 }}>0857-4189-2603</span>
            <div style={{ width: 1, height: 16, background: "rgba(251,247,241,0.3)" }} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>www.basecamppadel.id</span>
          </div>
          <span style={{ fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700, color: "#FFD43B" }}>Geser →</span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height,
      fonts: [
        { name: "Space Grotesk", data: displayBold, weight: 700, style: "normal" },
        { name: "Inter", data: textSemibold, weight: 600, style: "normal" },
      ],
    },
  );
  image.headers.set("Content-Disposition", `attachment; filename="pembagian-grup-${session.id}.png"`);
  return image;
}
