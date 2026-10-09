import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/accountRules";

/** Lands the Google login (players) and the magic link (admin); `next` is where the visitor came from. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"), "/admin");
  const isAdmin = next.startsWith("/admin");

  const fail = (message: string) => {
    const url = new URL(isAdmin ? "/admin/login" : "/masuk", origin);
    url.searchParams.set("error", message);
    if (!isAdmin) url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  };

  // Google sends the visitor back with ?error=… when they cancel or the provider fails
  if (searchParams.get("error")) {
    return fail(searchParams.get("error") === "access_denied" ? "Login dibatalkan." : "Login dengan Google gagal. Coba lagi.");
  }
  if (!code) return fail("Link login tidak valid.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return fail("Login gagal. Coba lagi.");
  if (isAdmin) return NextResponse.redirect(`${origin}${next}`);

  // a new player fills in the profile first, then continues to `next`
  const { data: profile } = await supabase.from("profiles").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!profile) return NextResponse.redirect(`${origin}/akun/lengkapi?next=${encodeURIComponent(next)}`);
  return NextResponse.redirect(`${origin}${next}`);
}
