"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
      else {
        router.replace(next);
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      setMsg(error ? error.message : "Cek email kamu — link login sudah dikirim.");
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
      {msg && <div className="text-sm text-snow/80">{msg}</div>}
      <button className="btn btn-coral py-3" disabled={busy} type="submit">
        {busy ? "..." : mode === "password" ? "Masuk" : "Kirim Magic Link"}
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
