import { NextResponse, type NextRequest } from "next/server";

/**
 * Redirects legacy Supabase callback calls to our direct Google OAuth callback.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const target = new URL("/api/auth/google/callback", origin);
  searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });
  return NextResponse.redirect(target);
}
