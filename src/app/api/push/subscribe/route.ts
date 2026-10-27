import { NextRequest, NextResponse } from "next/server";
import { saveSubscription } from "@/lib/webpush";
import { getSessionUser } from "@/lib/server/session";

/**
 * POST /api/push/subscribe
 * Body: { subscription: PushSubscription }
 * Saves the browser PushSubscription to MongoDB, optionally linked to the logged-in user.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, keys } = body?.subscription ?? {};

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "Invalid subscription object." },
        { status: 400 }
      );
    }

    // Optionally link to logged-in user (non-blocking if not logged in)
    let userId: string | null = null;
    let email: string | null = null;
    try {
      const user = await getSessionUser();
      if (user) {
        userId = user.id ?? null;
        email = user.email ?? null;
      }
    } catch {
      // ignore — guest subscribers are fine
    }

    await saveSubscription({ endpoint, keys }, userId, email);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
