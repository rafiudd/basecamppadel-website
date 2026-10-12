"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/Toast";

const GoogleMark = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" className="flex-none">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

/** Starts the Google OAuth round trip; /auth/callback brings the player back to `next`. */
export function GoogleButton({ next }: { next: string }) {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    const fail = (message: string) => {
      toast.error(message);
      setBusy(false);
    };
    // A disabled provider would otherwise land the player on Supabase's raw JSON error page.
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      });
      const settings = (await res.json()) as { external?: { google?: boolean } };
      if (settings.external?.google === false) return fail("Login Google belum diaktifkan. Hubungi admin Basecamp.");
    } catch {
      // settings unreachable: try the login anyway
    }

    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { prompt: "select_account" },
      },
    });
    // on success the browser is already leaving for Google, so keep the spinner
    if (error) fail("Login dengan Google gagal. Coba lagi.");
  }

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={busy}
      data-loading={busy || undefined}
      className="flex items-center justify-center gap-3 w-full min-h-13 rounded-xl border border-ink/18 bg-white text-ink font-sans font-semibold text-base hover:border-indigo transition-colors disabled:opacity-80"
    >
      <GoogleMark />
      Lanjut dengan Google
    </button>
  );
}
