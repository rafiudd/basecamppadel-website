import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/server/session";

const ALLOWED_MATCH_FIELDS = new Set([
  "team_a_games",
  "team_b_games",
  "team_a_sets",
  "team_b_sets",
  "points_a",
  "points_b",
  "serving_team",
  "is_live",
  "status",
  "timer_running",
  "timer_seconds",
  "court_id",
  "stream_url",
  "started_at",
  "finished_at",
  "wo",
  "winner_team",
]);

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "admin" && user.role !== "coach")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id, patch } = await req.json();
    if (!id || !patch || typeof patch !== "object") {
      return NextResponse.json({ error: "Missing match id or patch data." }, { status: 400 });
    }

    const sanitizedPatch: Record<string, any> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (ALLOWED_MATCH_FIELDS.has(key)) {
        sanitizedPatch[key] = value;
      }
    }

    if (Object.keys(sanitizedPatch).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const db = await getDb();
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
