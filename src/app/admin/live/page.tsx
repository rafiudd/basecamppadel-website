import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScoreControl } from "@/components/admin/ScoreControl";
import { createMatch, deleteMatch } from "@/app/admin/actions";

export default async function LiveAdmin({ searchParams }: { searchParams: Promise<{ match?: string }> }) {
  const { match: matchId } = await searchParams;
  const supabase = await createClient();

  const [{ data: matches }, { data: sessions }, { data: players }] = await Promise.all([
    supabase.from("matches").select("*").order("created_at", { ascending: false }).limit(30),
    supabase.from("sessions").select("id, title, venue, session_date").order("session_date", { ascending: false }).limit(30),
    supabase.from("players").select("*").eq("active", true).order("name"),
  ]);

  const list = matches ?? [];
  const selected =
    list.find((m) => m.id === matchId) ??
    list.find((m) => m.is_live) ??
    list.find((m) => m.status !== "finished") ??
    null;

  async function create(fd: FormData) {
    "use server";
    const id = await createMatch(fd);
    redirect(`/admin/live?match=${id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="font-display font-bold text-[26px]">Live Match</h1>
        <form action={create} className="flex items-center gap-2 flex-wrap">
          <select name="session_id" className="field w-auto text-sm">
            <option value="">Tanpa sesi</option>
            {(sessions ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} · {s.venue} · {s.session_date}
              </option>
            ))}
          </select>
          <button className="btn btn-coral" type="submit">+ Match baru</button>
        </form>
      </div>

      {list.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {list.map((m) => (
            <Link
              key={m.id}
              href={`/admin/live?match=${m.id}`}
              className={`no-underline text-snow flex-none rounded-xl px-3 py-2 text-xs border ${
                selected?.id === m.id ? "bg-indigo border-volt" : "bg-ink-3 border-transparent"
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                {m.is_live && <span className="w-2 h-2 rounded-full bg-coral animate-livepulse" />}
                {m.team_a_name} vs {m.team_b_name}
              </div>
              <div className="text-snow/50">{m.session_label || "—"} · {m.status}</div>
            </Link>
          ))}
        </div>
      )}

      {selected ? (
        <>
          <ScoreControl key={selected.id} initial={selected} players={players ?? []} />
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
