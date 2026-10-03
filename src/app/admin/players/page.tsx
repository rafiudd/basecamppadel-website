import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PlayerForm } from "@/components/admin/PlayerForm";
import { deletePlayer } from "@/app/admin/actions";

export default async function PlayersAdmin({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string }> }) {
  const { edit, new: isNew } = await searchParams;
  const supabase = await createClient();
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .order("gender")
    .order("points", { ascending: false });
  const editing = players?.find((p) => p.id === edit);
  const showForm = !!editing || isNew === "1";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display font-bold text-[26px]">Pemain</h1>
        {showForm ? (
          <Link href="/admin/players" className="text-sm text-snow/60 no-underline hover:text-volt">Batal</Link>
        ) : (
          <Link href="/admin/players?new=1" className="btn btn-coral px-4 py-2 text-sm no-underline">+ Tambah Pemain</Link>
        )}
      </div>

      {showForm && <PlayerForm key={editing?.id ?? "new"} player={editing} />}

      {!showForm && (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-snow/50 uppercase tracking-wide">
              <th className="pb-2 pr-3 font-semibold">Foto</th>
              <th className="pb-2 pr-3 font-semibold">Nama</th>
              <th className="pb-2 pr-3 font-semibold">Level</th>
              <th className="pb-2 pr-3 font-semibold">Region</th>
              <th className="pb-2 pr-3 font-semibold">Poin</th>
              <th className="pb-2 pr-3 font-semibold">W-L</th>
              <th className="pb-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {(players ?? []).map((p) => (
              <tr key={p.id} className={`border-t border-snow/10 ${p.id === edit ? "bg-indigo" : ""} ${p.active ? "" : "opacity-50"}`}>
                <td className="py-2 pr-3">
                  <div className="relative w-9 h-11 rounded-md bg-ink/40 overflow-hidden">
                    <Image
                      src={
                        p.photo_url ||
                        (p.gender === "F"
                          ? "/images/player-placeholder-women.svg"
                          : "/images/player-placeholder-men.svg")
                      }
                      alt=""
                      fill
                      sizes="36px"
                      unoptimized={!p.photo_url}
                      className="object-cover object-top"
                    />
                  </div>
                </td>
                <td className="py-2 pr-3 font-display font-bold whitespace-nowrap">
                  {p.name} <span className="text-xs font-sans text-snow/40">{p.gender === "M" ? "Men" : "Women"}</span>
                </td>
                <td className="py-2 pr-3 text-snow/70 whitespace-nowrap">{p.level}</td>
                <td className="py-2 pr-3 text-snow/70 whitespace-nowrap">{p.region}</td>
                <td className="py-2 pr-3 text-snow/70">{p.points}</td>
                <td className="py-2 pr-3 text-snow/70 whitespace-nowrap">{p.wins}–{p.losses}</td>
                <td className="py-2">
                  <div className="flex items-center gap-2 justify-end">
                    <Link href={`/admin/players?edit=${p.id}`} className="btn px-3 py-1.5 text-xs no-underline">Edit</Link>
                    <form action={deletePlayer}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="btn btn-danger px-3 py-1.5 text-xs" type="submit">Hapus</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {players?.length === 0 && <p className="text-sm text-snow/50 mt-3">Belum ada pemain.</p>}
      </div>
      )}
    </div>
  );
}
