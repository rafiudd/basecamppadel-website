"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/Toast";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setBusy(false);
    } else {
      toast.success("Berhasil masuk");
      router.replace(next);
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <div className="label">Email</div>
        <input
          className="field"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>
      <div>
        <div className="label">Password</div>
        <input
          className="field"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <button className="btn btn-coral py-3" disabled={busy} data-loading={busy || undefined} type="submit">
        Masuk
      </button>
    </form>
  );
}
