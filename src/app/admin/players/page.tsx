import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PlayerForm } from "@/components/admin/PlayerForm";
import { deletePlayer } from "@/app/admin/actions";

export default async function PlayersAdmin({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const supabase = await createClient();
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .order("gender")
    .order("points", { ascending: false });
  const editing = players?.find((p) => p.id === edit);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display font-bold text-[26px]">Pemain</h1>
        {editing && <Link href="/admin/players" className="text-sm text-snow/60 no-underline hover:text-volt">+ Pemain baru</Link>}
      </div>

      <PlayerForm key={editing?.id ?? "new"} player={editing} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {(players ?? []).map((p) => (
          <div key={p.id} className={`rounded-xl px-3 py-2.5 flex items-center gap-3 ${p.id === edit ? "bg-indigo" : "bg-ink-3"} ${p.active ? "" : "opacity-50"}`}>
            <div className="relative w-10 h-12 rounded-md bg-ink/40 overflow-hidden flex-none">
              <Image src={p.photo_url || "/images/player-placeholder.svg"} alt="" fill sizes="40px" unoptimized={!p.photo_url} className="object-cover object-top" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold truncate">
                {p.name} <span className="text-xs font-sans text-snow/40">{p.gender === "M" ? "Men" : "Women"}</span>
              </div>
              <div className="text-xs text-snow/60 truncate">{p.level} · {p.region} · {p.points} poin · {p.wins}–{p.losses}</div>
            </div>
            <Link href={`/admin/players?edit=${p.id}`} className="btn px-3 py-1.5 text-xs no-underline">Edit</Link>
            <form action={deletePlayer}>
              <input type="hidden" name="id" value={p.id} />
              <button className="btn btn-danger px-3 py-1.5 text-xs" type="submit">Hapus</button>
            </form>
          </div>
        ))}
        {players?.length === 0 && <p className="text-sm text-snow/50">Belum ada pemain.</p>}
      </div>
    </div>
  );
}
