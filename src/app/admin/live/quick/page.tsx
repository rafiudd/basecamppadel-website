import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { QuickScoreControl } from "@/components/admin/QuickScoreControl";
import type { Match } from "@/lib/database.types";

export default async function QuickLiveAdmin({ searchParams }: { searchParams: Promise<{ match?: string; court?: string }> }) {
  const { match: matchId, court: courtParam } = await searchParams;
  const supabase = await createClient();
  const [{ data: matches }, { data: courts }] = await Promise.all([
    supabase.from("matches").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("courts").select("*").eq("active", true).order("name"),
  ]);

  const list = matches ?? [];
  const courtList = courts ?? [];

  const currentForCourt = (courtId: string | null): Match | null =>
    list.find((m) => m.court_id === courtId && m.is_live) ??
    list.find((m) => m.court_id === courtId && m.status !== "finished") ??
    list.find((m) => m.court_id === courtId) ??
    null;

  const tabs = [...courtList.map((c) => ({ id: c.id as string | null, label: c.name })), { id: null, label: "Tanpa court" }];

  const activeCourtId =
    matchId != null
      ? list.find((m) => m.id === matchId)?.court_id ?? null
      : courtParam !== undefined
        ? courtParam || null
        : courtList[0]?.id ?? null;

  const selected = matchId ? list.find((m) => m.id === matchId) ?? null : currentForCourt(activeCourtId);
  const matchesForTab = list.filter((m) => m.court_id === activeCourtId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display font-bold text-[22px]">Skor Cepat</h1>
        <Link href="/admin/live" className="text-sm text-snow/60 no-underline hover:text-volt">Kontrol lengkap</Link>
      </div>

      {tabs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {tabs.map((t) => (
            <Link
              key={t.id ?? "none"}
              href={`/admin/live/quick?court=${t.id ?? ""}`}
              className={`no-underline flex-none rounded-full px-4 py-2.5 text-sm font-semibold ${
                activeCourtId === t.id ? "bg-indigo text-snow" : "bg-ink-3 text-snow/60"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      )}

      {selected ? (
        <QuickScoreControl key={selected.id} initial={selected} matches={matchesForTab} />
      ) : (
        <div className="flex flex-col gap-3 items-center text-center py-10">
          <p className="text-sm text-snow/60">Belum ada match di court ini.</p>
          <Link href="/admin/live" className="btn btn-coral no-underline">Buat match di kontrol lengkap</Link>
        </div>
      )}
    </div>
  );
}
