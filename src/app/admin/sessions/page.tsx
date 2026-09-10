import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SessionForm } from "@/components/admin/SessionForm";
import { deleteSession } from "@/app/admin/actions";
import { formatSessionDay } from "@/lib/format";

export default async function SessionsAdmin({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const supabase = await createClient();
  const { data: sessions } = await supabase.from("sessions").select("*").order("session_date", { ascending: false });
  const editing = sessions?.find((s) => s.id === edit);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display font-bold text-[26px]">Jadwal</h1>
        {editing && <Link href="/admin/sessions" className="text-sm text-snow/60 no-underline hover:text-volt">+ Sesi baru</Link>}
      </div>

      <SessionForm key={editing?.id ?? "new"} session={editing} />

      <div className="flex flex-col gap-2">
        {(sessions ?? []).map((s) => (
          <div key={s.id} className={`rounded-xl px-4 py-3 flex items-center gap-4 flex-wrap ${s.id === edit ? "bg-indigo" : "bg-ink-3"}`}>
            <div className="flex-1 min-w-[200px]">
              <div className="font-display font-bold">{s.title} {!s.published && <span className="text-xs text-snow/40 font-sans">(draft)</span>}</div>
              <div className="text-xs text-snow/60">{formatSessionDay(s.session_date)} · {s.time_range} · {s.venue} · {s.price}</div>
            </div>
            <Link href={`/admin/sessions?edit=${s.id}`} className="btn px-3 py-1.5 text-xs no-underline">Edit</Link>
            <form action={deleteSession}>
              <input type="hidden" name="id" value={s.id} />
              <button className="btn btn-danger px-3 py-1.5 text-xs" type="submit">Hapus</button>
            </form>
          </div>
        ))}
        {sessions?.length === 0 && <p className="text-sm text-snow/50">Belum ada sesi.</p>}
      </div>
    </div>
  );
}
