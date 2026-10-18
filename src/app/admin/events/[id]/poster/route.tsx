import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { getAdminUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadCompetition, courtNameOf } from "@/lib/compData";
import { loadMabarRounds } from "@/lib/mabar";
import { BrandMark } from "@/lib/brandMark";
import { parseDateParts } from "@/lib/format";
import type { GenParticipant } from "@/lib/database.types";

export const runtime = "nodejs";

type MatchRow = { p1: string; p2: string; court: string };

/** "Jadwal Ronde" poster for a mabar event — downloadable PNG listing every round's pairings, built
 *  straight from the real generator data (no manual input). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, isAdmin } = await getAdminUser();
  if (!user) return NextResponse.redirect(new URL(`/admin/login?next=${encodeURIComponent(request.nextUrl.pathname)}`, request.url));
  if (!isAdmin) return NextResponse.redirect(new URL("/", request.url));

  const supabase = await createClient();
  const data = await loadCompetition(supabase, { id });
  if (!data) return new NextResponse("Event tidak ditemukan.", { status: 404 });
  const { event, courts } = data;
  if (event.type !== "mabar" || !event.gen_event_id) return new NextResponse("Poster ronde cuma buat event mabar.", { status: 400 });

  const { participants, rounds, matches } = await loadMabarRounds(supabase, event.id, event.gen_event_id);
  const nameOf = new Map((participants as GenParticipant[]).map((p) => [p.id, p.display_name]));
  const pairName = (ids: string[]) => (ids.length ? ids.map((pid) => nameOf.get(pid) ?? "?").join(" / ") : "Tim");

  const roundsList = [...rounds]
    .sort((a, b) => a.round_no - b.round_no)
    .map((r) => {
      const rMatches = matches.filter((m) => m.round_id === r.id);
      const rows: MatchRow[] = rMatches.map((m, i) => ({
        p1: pairName(m.team_a_participant_ids ?? []),
        p2: pairName(m.team_b_participant_ids ?? []),
        court: m.court_id ? courtNameOf(courts, m.court_id) : `Court ${i + 1}`,
      }));
      return { roundNo: r.round_no, rows };
    })
    .filter((r) => r.rows.length > 0);

  if (roundsList.length === 0) return new NextResponse("Event ini belum punya jadwal ronde.", { status: 400 });

  const [displayBold, textSemibold] = await Promise.all([
    readFile(join(process.cwd(), "src/fonts/space-grotesk-latin-700-normal.woff")),
    readFile(join(process.cwd(), "src/fonts/inter-latin-600-normal.woff")),
  ]);

  const dateLabel = event.event_date ? parseDateParts(event.event_date).dateFormatted : "";
  const totalRows = roundsList.reduce((s, r) => s + r.rows.length, 0);
  const height = Math.min(9000, Math.max(1350, 420 + roundsList.length * 68 + totalRows * 72));

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
          <span>Jadwal&nbsp;</span>
          <span style={{ color: "#FF5A3C" }}>Ronde</span>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
          <div style={{ display: "flex", border: "2px solid #FFD43B", color: "#FFD43B", borderRadius: 999, padding: "10px 22px", fontSize: 18, fontWeight: 700 }}>
            {event.title}
          </div>
          {dateLabel && (
            <div style={{ display: "flex", background: "#FFD43B", color: "#1B1650", borderRadius: 999, padding: "10px 22px", fontSize: 18, fontWeight: 700 }}>
              {dateLabel}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28, marginTop: 44 }}>
          {roundsList.map((r) => (
            <div key={r.roundNo} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontFamily: "Space Grotesk", fontSize: 22, fontWeight: 700, color: "#FFD43B" }}>RONDE {r.roundNo}</span>
              <div style={{ display: "flex", flexDirection: "column", borderRadius: 18, overflow: "hidden" }}>
                {r.rows.map((row, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: "#FBF7F1",
                      padding: "16px 24px",
                      borderBottom: i < r.rows.length - 1 ? "1px solid rgba(27,22,80,0.08)" : "none",
                    }}
                  >
                    <span style={{ display: "flex", flex: 1, fontFamily: "Space Grotesk", fontSize: 22, fontWeight: 700, color: "#1B1650" }}>{row.p1}</span>
                    <span style={{ display: "flex", fontSize: 14, fontWeight: 700, color: "rgba(27,22,80,0.4)", padding: "0 16px" }}>VS</span>
                    <span style={{ display: "flex", flex: 1, justifyContent: "flex-end", fontFamily: "Space Grotesk", fontSize: 22, fontWeight: 700, color: "#1B1650", textAlign: "right" }}>
                      {row.p2}
                    </span>
                    <span style={{ display: "flex", fontSize: 13, fontWeight: 600, color: "rgba(27,22,80,0.5)", marginLeft: 16, flex: "none" }}>{row.court}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
  image.headers.set("Content-Disposition", `attachment; filename="jadwal-ronde-${event.id}.png"`);
  return image;
}
