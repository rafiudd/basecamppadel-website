"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/Toast";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supabase = createClient();
    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        setBusy(false);
      } else {
        // keep the spinner until the admin page takes over
        toast.success("Berhasil masuk");
        router.replace(next);
        router.refresh();
      }
      return;
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) toast.error(error.message);
      else toast.success("Cek email kamu — link login sudah dikirim.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <div className="label">Email</div>
        <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      {mode === "password" && (
        <div>
          <div className="label">Password</div>
          <input className="field" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
      )}
      <button className="btn btn-coral py-3" disabled={busy} data-loading={busy || undefined} type="submit">
        {mode === "password" ? "Masuk" : "Kirim Magic Link"}
      </button>
      <button
        type="button"
        className="text-xs text-snow/50 hover:text-volt bg-transparent border-none"
        onClick={() => setMode(mode === "password" ? "magic" : "password")}
      >
        {mode === "password" ? "Pakai magic link via email" : "Pakai password"}
      </button>
    </form>
  );
}
