import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SessionForm } from "@/components/admin/SessionForm";
import { deleteSession } from "@/app/admin/actions";
import { formatSessionDay } from "@/lib/format";

export default async function SessionsAdmin({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string }> }) {
  const { edit, new: isNew } = await searchParams;
  const supabase = await createClient();
  const [{ data: sessions }, { data: venues }] = await Promise.all([
    supabase.from("sessions").select("*").order("session_date", { ascending: false }),
    supabase.from("venues").select("*").eq("active", true).order("name"),
  ]);
  const editing = sessions?.find((s) => s.id === edit);
  const showForm = !!editing || isNew === "1";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display font-bold text-[26px]">Jadwal</h1>
        {showForm ? (
          <Link href="/admin/sessions" className="text-sm text-snow/60 no-underline hover:text-volt">Batal</Link>
        ) : (
          <Link href="/admin/sessions?new=1" className="btn btn-coral px-4 py-2 text-sm no-underline">+ Tambah Sesi</Link>
        )}
      </div>

      {showForm && <SessionForm key={editing?.id ?? "new"} session={editing} venues={venues ?? []} />}

      {!showForm && (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-snow/50 uppercase tracking-wide">
              <th className="pb-2 pr-3 font-semibold">Judul</th>
              <th className="pb-2 pr-3 font-semibold">Tanggal</th>
              <th className="pb-2 pr-3 font-semibold">Jam</th>
              <th className="pb-2 pr-3 font-semibold">Venue</th>
              <th className="pb-2 pr-3 font-semibold">Harga</th>
              <th className="pb-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {(sessions ?? []).map((s) => (
              <tr key={s.id} className={`border-t border-snow/10 ${s.id === edit ? "bg-indigo" : ""}`}>
                <td className="py-2.5 pr-3 font-display font-bold whitespace-nowrap">
                  {s.title} {!s.published && <span className="text-xs text-snow/40 font-sans">(draft)</span>}
                </td>
                <td className="py-2.5 pr-3 text-snow/70 whitespace-nowrap">{formatSessionDay(s.session_date)}</td>
                <td className="py-2.5 pr-3 text-snow/70 whitespace-nowrap">{s.time_range}</td>
                <td className="py-2.5 pr-3 text-snow/70 whitespace-nowrap">{s.venue}</td>
                <td className="py-2.5 pr-3 text-snow/70 whitespace-nowrap">{s.price}</td>
                <td className="py-2.5">
                  <div className="flex items-center gap-2 justify-end">
                    <Link href={`/admin/sessions?edit=${s.id}`} className="btn px-3 py-1.5 text-xs no-underline">Edit</Link>
                    <form action={deleteSession}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="btn btn-danger px-3 py-1.5 text-xs" type="submit">Hapus</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sessions?.length === 0 && <p className="text-sm text-snow/50 mt-3">Belum ada sesi.</p>}
      </div>
      )}
    </div>
  );
}
