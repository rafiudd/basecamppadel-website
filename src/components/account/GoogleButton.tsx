"use client";

import { useState } from "react";
import { GoogleMark } from "./GoogleMark";

/** Starts the direct Google OAuth round trip; /api/auth/google brings the player back to `next`. */
export function GoogleButton({ next }: { next: string }) {
  const [busy, setBusy] = useState(false);

  function signIn() {
    setBusy(true);
    window.location.href = `/api/auth/google?next=${encodeURIComponent(next)}`;
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
