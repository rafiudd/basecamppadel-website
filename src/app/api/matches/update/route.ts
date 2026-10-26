import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/server/session";

// Must match the real Match fields (src/lib/database.types.ts) — useMatchControl.ts sends
// Partial<Match> patches straight through this whitelist, so a stale/wrong name here silently
// drops that field instead of erroring.
const ALLOWED_MATCH_FIELDS = new Set([
  "team_a_sets",
  "team_b_sets",
  "team_a_games",
  "team_b_games",
  "team_a_game",
  "team_b_game",
  "set_label",
  "serve",
  "status",
  "is_live",
  "timer_start",
  "timer_base_seconds",
  "timer_running",
  "court_id",
  "winner",
  "winner_team_id",
  "is_wo",
  "finished_at",
]);

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const db = await getDb();
    const adminRow = await db.collection("admin_users").findOne({
      $or: [{ _id: user.id }, { user_id: user.id }],
    } as any);

    if (adminRow?.role !== "admin" && adminRow?.role !== "scorekeeper") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id, patch } = await req.json();
    if (!id || !patch || typeof patch !== "object") {
      return NextResponse.json(
        { error: "Missing match id or patch data." },
        { status: 400 }
      );
    }

    const sanitizedPatch: Record<string, any> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (ALLOWED_MATCH_FIELDS.has(key)) {
        sanitizedPatch[key] = value;
      }
    }

    if (Object.keys(sanitizedPatch).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 }
      );
    }

    if (sanitizedPatch.is_live === true) {
      const existing = await db.collection("matches").findOne({
        $or: [{ _id: id }, { id }],
      } as any);
      const courtId = sanitizedPatch.court_id ?? existing?.court_id;
      if (courtId) {
        const conflict = await db.collection("matches").findOne({
          court_id: courtId,
          is_live: true,
          _id: { $ne: existing?._id ?? id },
          id: { $ne: id },
        } as any);
        if (conflict) {
          return NextResponse.json(
            {
              error:
                "Court ini baru saja di-ON AIR-kan operator lain. Muat ulang lalu coba lagi.",
            },
            { status: 409 }
          );
        }
      }
    }

    const updateData = {
      ...sanitizedPatch,
      updated_at: new Date(),
    };

    await db.collection("matches").updateOne(
      { $or: [{ _id: id }, { id }] } as any,
      { $set: updateData }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
