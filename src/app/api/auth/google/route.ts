import { NextRequest, NextResponse } from "next/server";
import { safeNext } from "@/lib/accountRules";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const next = safeNext(searchParams.get("next"), "/akun");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error("GOOGLE_CLIENT_ID is not configured in environment variables");
    return NextResponse.redirect(
      new URL(
        `/masuk?error=${encodeURIComponent("Konfigurasi Google Auth belum lengkap.")}&next=${encodeURIComponent(next)}`,
        origin
      )
    );
  }

  const redirectUri = `${origin}/api/auth/google/callback`;
  const state = Buffer.from(JSON.stringify({ next })).toString("base64url");

  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.searchParams.set("client_id", clientId);
  googleUrl.searchParams.set("redirect_uri", redirectUri);
  googleUrl.searchParams.set("response_type", "code");
  googleUrl.searchParams.set("scope", "openid email profile");
  googleUrl.searchParams.set("access_type", "online");
  googleUrl.searchParams.set("prompt", "select_account");
  googleUrl.searchParams.set("state", state);

  return NextResponse.redirect(googleUrl.toString());
}

