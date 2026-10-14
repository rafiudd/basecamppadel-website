import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { accountStep, safeNext, stepPath } from "@/lib/accountRules";
import { ensureDefaultPhoto } from "@/lib/accountPhoto";

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

  if (isAdmin) {
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (adminRow?.role === "admin") {
      return NextResponse.redirect(`${origin}${next}`);
    }
    if (adminRow?.role === "coach") {
      return NextResponse.redirect(`${origin}/admin/coaching`);
    }

    // Akun bukan admin/coach -> arahkan ke akun pemain
    const { data: profile } = await supabase
      .from("profiles")
      .select("player_id, claim_player_id, photo_url, photo_source")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (profile) await ensureDefaultPhoto(supabase, data.user, profile);
    return NextResponse.redirect(`${origin}${stepPath(accountStep(profile), "/akun")}`);
  }

  // a new player fills in the profile (and answers "Ini saya?") first, then continues to `next`
  const { data: profile } = await supabase.from("profiles").select("player_id, claim_player_id, photo_url, photo_source").eq("user_id", data.user.id).maybeSingle();
  if (profile) await ensureDefaultPhoto(supabase, data.user, profile);
  return NextResponse.redirect(`${origin}${stepPath(accountStep(profile), next)}`);
}
