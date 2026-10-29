"use client";

import { useState } from "react";
import { clearAccountChipCache } from "@/components/account/useAccountChip";

/** "Keluar": a plain POST to /auth/signout (full page load); the button spins until the page leaves. */
export function SignOutForm({ className }: { className: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      action="/auth/signout"
      method="post"
      onSubmit={() => {
        clearAccountChipCache();
        setBusy(true);
      }}
    >
      <button type="submit" disabled={busy} data-loading={busy || undefined} className={className}>
        Keluar
      </button>
    </form>
  );
}
