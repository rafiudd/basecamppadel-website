import { LoginForm } from "./LoginForm";
import { MountainMark } from "@/components/Logo";

export const metadata = { title: "Admin Login — Basecamp Padel" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <div className="min-h-screen bg-ink text-snow font-sans flex items-center justify-center p-6">
      <div className="w-full max-w-100 bg-indigo rounded-2xl p-8 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <MountainMark size={32} />
          <div className="font-display font-bold text-lg leading-stat">
            BASECAMP <span className="text-coral">PADEL</span>
            <div className="font-sans font-medium text-xs text-snow/50 mt-0.5">Admin</div>
          </div>
        </div>
        {error && <div className="text-sm text-loss bg-loss/15 rounded-lg px-3 py-2">{error}</div>}
        <LoginForm next={next ?? "/admin"} />
      </div>
    </div>
  );
}
