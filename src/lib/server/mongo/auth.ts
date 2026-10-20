import { getDb } from "@/lib/mongodb";
import { getSessionUser, setSessionCookie, clearSessionCookie } from "../session";
import bcrypt from "bcryptjs";

/**
 * Creates the auth adapter emulating Supabase Auth via Mongo + session cookies.
 */
export function createMongoAuthAdapter() {
  return {
    getUser: async () => {
      const sessionUser = await getSessionUser();
      if (!sessionUser) return { data: { user: null }, error: null };
      return {
        data: {
          user: {
            id: sessionUser.id,
            email: sessionUser.email,
            user_metadata: sessionUser.user_metadata,
          },
        },
        error: null,
      };
    },

    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const db = await getDb();
      const user = await db.collection("auth_users").findOne({ email: email.toLowerCase().trim() });
      if (!user || !user.encrypted_password) {
        return { data: { user: null }, error: { message: "Email atau password salah." } };
      }

      const isMatch = await bcrypt.compare(password, user.encrypted_password);
      if (!isMatch) {
        return { data: { user: null }, error: { message: "Email atau password salah." } };
      }

      const userId = String(user.id || user._id);
      const adminRow = await db.collection("admin_users").findOne({
        $or: [{ user_id: userId }, { _id: userId }],
      } as any);

      await setSessionCookie({
        id: userId,
        email: user.email,
        role: adminRow?.role || "admin",
        coach_id: adminRow?.coach_id || null,
        user_metadata: user.raw_user_meta_data || {},
      });

      return {
        data: {
          user: {
            id: userId,
            email: user.email,
            user_metadata: user.raw_user_meta_data || {},
          },
        },
        error: null,
      };
    },

    exchangeCodeForSession: async (code: string) => {
      const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!sbUrl || !anonKey) {
        return { data: { user: null }, error: { message: "Auth provider not configured" } };
      }

      try {
        const res = await fetch(`${sbUrl}/auth/v1/token?grant_type=pkce`, {
          method: "POST",
          headers: {
            apikey: anonKey,
            "content-type": "application/json",
          },
          body: JSON.stringify({ auth_code: code }),
        });

        const tokenData = await res.json();
        if (!res.ok || !tokenData?.user) {
          return { data: { user: null }, error: { message: tokenData?.error_description || "Exchange failed" } };
        }

        const sbUser = tokenData.user;
        const db = await getDb();

        await db.collection("auth_users").updateOne(
          { $or: [{ _id: sbUser.id }, { id: sbUser.id }] } as any,
          {
            $set: {
              id: sbUser.id,
              email: sbUser.email,
              role: "authenticated",
              raw_user_meta_data: sbUser.user_metadata || {},
              updated_at: new Date(),
            },
            $setOnInsert: { created_at: new Date() },
          },
          { upsert: true }
        );

        const adminRow = await db.collection("admin_users").findOne({
          $or: [{ user_id: sbUser.id }, { _id: sbUser.id }],
        } as any);

        await setSessionCookie({
          id: sbUser.id,
          email: sbUser.email,
          role: adminRow?.role || "authenticated",
          coach_id: adminRow?.coach_id || null,
          user_metadata: sbUser.user_metadata || {},
        });

        return { data: { user: sbUser }, error: null };
      } catch (err: any) {
        return { data: { user: null }, error: err };
      }
    },

    signOut: async () => {
      await clearSessionCookie();
      return { error: null };
    },
  };
}
