import { ActionForm } from "@/components/admin/ActionForm";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GenEventForm } from "@/components/admin/GenEventForm";
import { deleteEvent } from "@/app/admin/generator/actions";

const FORMAT_LABEL: Record<string, string> = {
  americano: "Americano",
  mexicano: "Mexicano",
  fixed_americano: "Fixed Americano",
  fixed_mexicano: "Fixed Mexicano",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  active: "Berjalan",
  finished: "Selesai",
};

export default async function GeneratorAdmin({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { new: isNew } = await searchParams;
  const supabase = await createClient();
  const [{ data: events }, { data: courts }] = await Promise.all([
    supabase.from("gen_events").select("*").order("created_at", { ascending: false }),
    supabase.from("courts").select("*").eq("active", true).order("name"),
  ]);
  const showForm = isNew === "1";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-page">Generator</h1>
          <p className="text-sm text-snow/60">Bikin roster, generate pairing per ronde per court, input poin, lihat standing — Americano/Mexicano.</p>
        </div>
        {showForm ? (
          <Link href="/admin/generator" className="text-sm text-snow/60 no-underline hover:text-volt">Batal</Link>
        ) : (
          <Link href="/admin/generator?new=1" className="btn btn-coral px-4 py-2 text-sm no-underline">+ Event Baru</Link>
        )}
      </div>

      {showForm && <GenEventForm courts={courts ?? []} />}

      {!showForm && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-snow/50 uppercase tracking-wide">
                <th className="pb-2 pr-3 font-semibold">Judul</th>
                <th className="pb-2 pr-3 font-semibold">Format</th>
                <th className="pb-2 pr-3 font-semibold">Status</th>
                <th className="pb-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {(events ?? []).map((e) => (
                <tr key={e.id} className="border-t border-snow/10">
                  <td className="py-2.5 pr-3 font-display font-bold whitespace-nowrap">{e.title || "Mabar"}</td>
                  <td className="py-2.5 pr-3 text-snow/70 whitespace-nowrap">{FORMAT_LABEL[e.format]}</td>
                  <td className="py-2.5 pr-3 text-snow/70">{STATUS_LABEL[e.status]}</td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2 justify-end">
                      <Link href={`/admin/generator/${e.id}`} className="btn px-3 py-1.5 text-xs no-underline">Buka</Link>
                      <ActionForm action={deleteEvent} successText="Event dihapus">
                        <input type="hidden" name="id" value={e.id} />
                        <button className="btn btn-danger px-3 py-1.5 text-xs" type="submit">Hapus</button>
                      </ActionForm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {events?.length === 0 && <p className="text-sm text-snow/50 mt-3">Belum ada event.</p>}
        </div>
      )}
    </div>
  );
}
