import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/server/session";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "admin" && user.role !== "coach")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id, patch } = await req.json();
    if (!id || !patch) {
      return NextResponse.json({ error: "Missing match id or patch data." }, { status: 400 });
    }

    const db = await getDb();
    const updateData = {
      ...patch,
      updated_at: new Date(),
    };

    await db.collection("matches").updateOne(
      { $or: [{ _id: id }, { id }] },
      { $set: updateData }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
