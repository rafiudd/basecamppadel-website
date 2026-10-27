import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { setSessionCookie } from "@/lib/server/session";
import { accountHome, accountStep, canOpenAdminPath, safeNext, stepPath, staffRole } from "@/lib/accountRules";
import { createClient } from "@/lib/supabase/server";
import { ensureDefaultPhoto } from "@/lib/accountPhoto";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const stateParam = searchParams.get("state");

  let next = "/akun";
  if (stateParam) {
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString("utf8"));
      if (decoded?.next) next = safeNext(decoded.next, "/akun");
    } catch {
      // ignore
    }
  }

  const isAdmin = next.startsWith("/admin");

  const fail = (message: string) => {
    const url = new URL(isAdmin ? "/admin/login" : "/masuk", origin);
    url.searchParams.set("error", message);
    if (!isAdmin) url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  };

  if (errorParam) {
    return fail(errorParam === "access_denied" ? "Login dibatalkan." : "Login dengan Google gagal. Coba lagi.");
  }

  if (!code) {
    return fail("Link login tidak valid atau kode autentikasi hilang.");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Google OAuth credentials missing in environment variables.");
    return fail("Konfigurasi server belum lengkap.");
  }

  try {
    const redirectUri = `${origin}/api/auth/google/callback`;

    // 1. Exchange code for Google access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Google token exchange error:", tokenData);
      return fail("Gagal memverifikasi akun Google ke server.");
    }

    // 2. Fetch user profile from Google
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userRes.json();
    if (!userRes.ok || !googleUser.email || !googleUser.sub) {
      console.error("Google userinfo error:", googleUser);
      return fail("Gagal mengambil data profil Google.");
    }

    const cleanEmail = String(googleUser.email).toLowerCase().trim();
    const sub = String(googleUser.sub);
    const db = await getDb();

    // 3. Find or create user in MongoDB
    let userId: string;

    const identity = await db.collection("auth_identities").findOne({
      provider: "google",
      $or: [{ provider_id: sub }, { "identity_data.sub": sub }],
    } as any);

    if (identity?.user_id) {
      userId = String(identity.user_id);
    } else {
      // Check if user already exists by email
      const existingUser = await db.collection("auth_users").findOne({ email: cleanEmail });

      if (existingUser) {
        userId = String(existingUser.id || existingUser._id);
      } else {
        userId = crypto.randomUUID();
        await db.collection("auth_users").insertOne({
          _id: userId,
          id: userId,
          email: cleanEmail,
          role: "authenticated",
          raw_user_meta_data: {
            name: googleUser.name || cleanEmail.split("@")[0],
            full_name: googleUser.name || cleanEmail.split("@")[0],
            avatar_url: googleUser.picture || null,
            picture: googleUser.picture || null,
            email: cleanEmail,
          },
          created_at: new Date(),
          updated_at: new Date(),
        } as any);
      }

      // Link Google identity
      await db.collection("auth_identities").updateOne(
        { provider: "google", provider_id: sub } as any,
        {
          $set: {
            user_id: userId,
            provider: "google",
            provider_id: sub,
            identity_data: {
              sub,
              email: cleanEmail,
              name: googleUser.name,
              avatar_url: googleUser.picture,
              picture: googleUser.picture,
            },
            updated_at: new Date(),
          },
          $setOnInsert: { _id: crypto.randomUUID(), created_at: new Date() },
        } as any,
        { upsert: true }
      );
    }

    // Update latest avatar and name in auth_users
    await db.collection("auth_users").updateOne(
      { $or: [{ _id: userId }, { id: userId }] } as any,
      {
        $set: {
          "raw_user_meta_data.name": googleUser.name || cleanEmail.split("@")[0],
          "raw_user_meta_data.avatar_url": googleUser.picture || null,
          "raw_user_meta_data.picture": googleUser.picture || null,
          updated_at: new Date(),
        },
      }
    );

    // 4. Check admin / coach / score keeper role
    const adminRow = await db.collection("admin_users").findOne({
      $or: [{ user_id: userId }, { _id: userId }],
    } as any);
    const role = staffRole(adminRow);

    // 5. Set session cookie
    await setSessionCookie({
      id: userId,
      email: cleanEmail,
      role: role || "authenticated",
      coach_id: adminRow?.coach_id || null,
      user_metadata: {
        name: googleUser.name,
        avatar_url: googleUser.picture,
        picture: googleUser.picture,
      },
    });

    // 6. Handle redirects
    if (isAdmin && role) {
      return NextResponse.redirect(`${origin}${canOpenAdminPath(role, next) ? next : accountHome(role)}`);
    }

    // Player flow
    const profile = await db.collection("profiles").findOne({
      $or: [{ _id: userId }, { user_id: userId }],
    } as any);

    if (profile) {
      try {
        const supabase = await createClient();
        await ensureDefaultPhoto(
          supabase,
          {
            id: userId,
            user_metadata: {
              picture: googleUser.picture,
              avatar_url: googleUser.picture,
            },
          },
          profile as any
        );
      } catch (err) {
        console.warn("Avatar sync error:", err);
      }
    }

    const destination = stepPath(
      accountStep(profile as any),
      isAdmin ? "/akun" : next
    );
    return NextResponse.redirect(`${origin}${destination}`);
  } catch (err: any) {
    console.error("Google OAuth callback exception:", err);
    return fail("Terjadi kesalahan pada sistem saat login.");
  }
}
