import { NextRequest, NextResponse } from "next/server";
import { sendPushToAll, sendPushToUser } from "@/lib/webpush";
import { getSessionUser } from "@/lib/server/session";
import { getDb } from "@/lib/mongodb";

/**
 * POST /api/push/send
 *
 * Internal endpoint — only callable by admin/scorekeeper or server-side actions.
 *
 * Body variants:
 *   { type: "broadcast", title, body, url? }
 *   { type: "user", userId: "...", title, body, url? }
 *   { type: "user", email: "...", title, body, url? }
 */
export async function POST(req: NextRequest) {
  try {
    // Auth: must be admin or scorekeeper
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const adminRow = await db.collection("admin_users").findOne({
      $or: [{ _id: user.id }, { user_id: user.id }],
    } as any);

    if (adminRow?.role !== "admin" && adminRow?.role !== "scorekeeper") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { type, title, body: msgBody, url } = body;

    if (!title || !msgBody) {
      return NextResponse.json({ error: "title and body are required." }, { status: 400 });
    }

    const payload = { title, body: msgBody, url: url ?? "/" };

    if (type === "broadcast") {
      const result = await sendPushToAll(payload);
      return NextResponse.json({ success: true, ...result });
    }

    if (type === "user") {
      const { userId, email } = body;
      if (!userId && !email) {
        return NextResponse.json(
          { error: "userId or email required for user notification." },
          { status: 400 }
        );
      }
      const identifier = userId ? { userId } : { email };
      const result = await sendPushToUser(identifier, payload);
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json(
      { error: "type must be 'broadcast' or 'user'." },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
