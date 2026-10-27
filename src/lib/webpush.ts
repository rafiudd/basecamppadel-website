import webpush from "web-push";
import { getDb } from "@/lib/mongodb";

// Configure web-push with VAPID keys once (module-level side-effect)
webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export type PushSubscriptionDoc = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userId?: string | null;
  email?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Returns the push_subscriptions collection.
 */
async function getCollection() {
  const db = await getDb();
  return db.collection<PushSubscriptionDoc>("push_subscriptions");
}

/**
 * Saves or updates a push subscription in MongoDB.
 * Upserts by endpoint so re-subscribing the same device is idempotent.
 */
export async function saveSubscription(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  userId?: string | null,
  email?: string | null
) {
  const coll = await getCollection();
  await coll.updateOne(
    { endpoint: subscription.endpoint },
    {
      $set: {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userId: userId ?? null,
        email: email ?? null,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
}

/**
 * Sends a push notification to a single subscription.
 * Returns true on success, false if the subscription is expired/invalid (and removes it).
 */
async function sendToOne(
  sub: PushSubscriptionDoc,
  payload: object
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify(payload)
    );
    return true;
  } catch (err: any) {
    // 410 Gone / 404 Not Found = subscription expired → remove from DB
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      const coll = await getCollection();
      await coll.deleteOne({ endpoint: sub.endpoint });
    }
    return false;
  }
}

export type PushPayload = {
  title: string;
  body: string;
  /** URL to open when notification is tapped */
  url?: string;
  /** Icon override (defaults to /BasecampPadel_logo.png) */
  icon?: string;
};

/**
 * Broadcasts a push notification to ALL subscribers.
 */
export async function sendPushToAll(payload: PushPayload) {
  const coll = await getCollection();
  const subs = await coll.find({}).toArray();
  const results = await Promise.allSettled(
    subs.map((sub) => sendToOne(sub, { ...payload, icon: payload.icon ?? "/BasecampPadel_logo.png" }))
  );
  const sent = results.filter((r) => r.status === "fulfilled" && r.value).length;
  return { sent, total: subs.length };
}

/**
 * Sends a push notification to a specific user (by userId or email).
 */
export async function sendPushToUser(
  identifier: { userId: string } | { email: string },
  payload: PushPayload
) {
  const coll = await getCollection();
  const filter = "userId" in identifier
    ? { userId: identifier.userId }
    : { email: identifier.email };
  const subs = await coll.find(filter).toArray();
  const results = await Promise.allSettled(
    subs.map((sub) => sendToOne(sub, { ...payload, icon: payload.icon ?? "/BasecampPadel_logo.png" }))
  );
  const sent = results.filter((r) => r.status === "fulfilled" && r.value).length;
  return { sent, total: subs.length };
}
