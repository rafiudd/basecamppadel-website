import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScoreControl } from "@/components/admin/ScoreControl";
import { NewMatchModal } from "@/components/admin/NewMatchModal";
import { createMatch, deleteMatch } from "@/app/admin/actions";
import type { Match } from "@/lib/database.types";

export default async function LiveAdmin({ searchParams }: { searchParams: Promise<{ match?: string; tab?: string }> }) {
  const { match: matchId, tab } = await searchParams;
  const activeTab = tab === "riwayat" ? "riwayat" : "live";
  const supabase = await createClient();

  const [{ data: matches }, { data: sessions }, { data: players }, { data: courts }, { data: venues }] = await Promise.all([
    supabase.from("matches").select("*").order("created_at", { ascending: false }).limit(30),
    supabase.from("sessions").select("id, title, venue, session_date").order("session_date", { ascending: false }).limit(30),
    supabase.from("players").select("*").eq("active", true).order("name"),
    supabase.from("courts").select("*").eq("active", true).order("name"),
    supabase.from("venues").select("*").eq("active", true).order("name"),
  ]);

  const list = matches ?? [];
  const courtList = courts ?? [];
  const courtName = (id: string | null) => courtList.find((c) => c.id === id)?.name ?? "—";
  const selected =
    list.find((m) => m.id === matchId) ??
    list.find((m) => m.is_live) ??
    list.find((m) => m.status !== "finished") ??
    null;

  const current = list.filter((m) => m.status !== "finished");
  const past = list.filter((m) => m.status === "finished");
  const rows = activeTab === "riwayat" ? past : current;

  async function create(fd: FormData) {
    "use server";
    const id = await createMatch(fd);
    redirect(`/admin/live?match=${id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="font-display font-bold text-[26px]">Live Match</h1>
          {selected && (
            <Link href={`/admin/live/quick?match=${selected.id}`} className="text-sm text-snow/60 no-underline hover:text-volt">
              📱 Mode HP
            </Link>
          )}
        </div>
        <NewMatchModal
          action={create}
          sessions={(sessions ?? []).map((s) => ({ id: s.id, label: `${s.title} · ${s.venue} · ${s.session_date}` }))}
          courts={courtList.map((c) => ({ id: c.id, label: c.name }))}
        />
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <Link
          href="/admin/live?tab=live"
          className={`no-underline text-snow rounded-full px-4 py-2 text-sm font-semibold ${
            activeTab === "live" ? "bg-indigo" : "bg-ink-3 text-snow/60"
          }`}
        >
          Live &amp; Terjadwal ({current.length})
        </Link>
        <Link
          href="/admin/live?tab=riwayat"
          className={`no-underline text-snow rounded-full px-4 py-2 text-sm font-semibold ${
            activeTab === "riwayat" ? "bg-indigo" : "bg-ink-3 text-snow/60"
          }`}
        >
          Riwayat ({past.length})
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-snow/50 uppercase tracking-wide">
              <th className="pb-2 pr-3 font-semibold">Match</th>
              <th className="pb-2 pr-3 font-semibold">Court</th>
              <th className="pb-2 pr-3 font-semibold">Sesi</th>
              <th className="pb-2 pr-3 font-semibold">Status</th>
              <th className="pb-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className={`border-t border-snow/10 ${selected?.id === m.id ? "bg-indigo" : ""}`}>
                <td className="py-2.5 pr-3 font-display font-bold whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {m.is_live && <span className="w-2 h-2 rounded-full bg-coral animate-livepulse flex-none" />}
                    {m.team_a_name} vs {m.team_b_name}
                  </div>
                </td>
                <td className="py-2.5 pr-3 text-snow/70 whitespace-nowrap">{courtName(m.court_id)}</td>
                <td className="py-2.5 pr-3 text-snow/70 whitespace-nowrap">{m.session_label || "—"}</td>
                <td className="py-2.5 pr-3 text-snow/70">{m.status}</td>
                <td className="py-2.5">
                  <Link href={`/admin/live?match=${m.id}&tab=${activeTab}`} className="btn px-3 py-1.5 text-xs no-underline">
                    {selected?.id === m.id ? "Dipilih" : "Pilih"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="text-sm text-snow/50 mt-3">Belum ada match.</p>}
      </div>

      {selected ? (
        <>
          <ScoreControl key={selected.id} initial={selected} players={players ?? []} courts={courtList} venues={venues ?? []} />
          <form action={deleteMatch} className="flex justify-end">
            <input type="hidden" name="id" value={selected.id} />
            <button className="btn btn-danger text-xs" type="submit">Hapus match ini</button>
          </form>
        </>
      ) : (
        <p className="text-sm text-snow/60">Belum ada match. Buat match baru untuk mulai mengontrol skor.</p>
      )}
    </div>
  );
}
