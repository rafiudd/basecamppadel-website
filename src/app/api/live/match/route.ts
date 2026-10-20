import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get("matchId");
    const eventId = searchParams.get("eventId");
    const courtId = searchParams.get("courtId");

    const db = await getDb();
    const coll = db.collection("matches");

    if (matchId) {
      const match = await coll.findOne({ $or: [{ _id: matchId }, { id: matchId }] } as any);
      return NextResponse.json({ match: match ? { ...match, id: String(match.id || match._id) } : null });
    }

    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 20) : 1;

    const filter: Record<string, any> = { is_live: true };
    if (eventId) filter.event_id = eventId;
    if (courtId) filter.court_id = courtId;

    const docs = await coll.find(filter).sort({ updated_at: -1 }).limit(limit).toArray();
    const formatted = docs.map((m) => ({ ...m, id: String(m.id || m._id) }));
    const match = formatted.length > 0 ? formatted[0] : null;

    const response = NextResponse.json({ match, matches: formatted });
    response.headers.set("Cache-Control", "public, s-maxage=1, stale-while-revalidate=2");
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
