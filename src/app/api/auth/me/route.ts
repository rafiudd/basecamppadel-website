import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ user: null, profile: null, adminRow: null });
    }

    const db = await getDb();
    const [profile, adminRow] = await Promise.all([
      db.collection("profiles").findOne({ $or: [{ user_id: user.id }, { _id: user.id }] } as any),
      db.collection("admin_users").findOne({ $or: [{ user_id: user.id }, { _id: user.id }] } as any),
    ]);

    return NextResponse.json({
      user,
      profile: profile ? { ...profile, id: String(profile.id || profile._id) } : null,
      adminRow: adminRow ? { ...adminRow, id: String(adminRow.id || adminRow._id) } : null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
