import { getDb } from "../../mongodb.ts";
import { getSessionUser, setSessionCookie, clearSessionCookie } from "../session.ts";
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

      if (!adminRow || (adminRow.role !== "admin" && adminRow.role !== "coach" && adminRow.role !== "scorekeeper")) {
        return { data: { user: null }, error: { message: "Akun Anda tidak memiliki hak akses admin, coach, atau score keeper." } };
      }

      await setSessionCookie({
        id: userId,
        email: user.email,
        role: adminRow.role,
        coach_id: adminRow.coach_id || null,
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

    exchangeCodeForSession: async (_code: string) => {
      return {
        data: { user: null },
        error: { message: "Use /api/auth/google/callback for Google OAuth." },
      };
    },

    signOut: async () => {
      await clearSessionCookie();
      return { error: null };
    },
  };
}
