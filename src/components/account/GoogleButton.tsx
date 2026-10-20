"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/Toast";
import { GoogleMark } from "./GoogleMark";

/** Starts the Google OAuth round trip; /auth/callback brings the player back to `next`. */
export function GoogleButton({ next }: { next: string }) {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    const fail = (message: string) => {
      toast.error(message);
      setBusy(false);
    };
    // Direct OAuth redirect

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
      <GoogleMark size={20} />
      Lanjut dengan Google
    </button>
  );
}
