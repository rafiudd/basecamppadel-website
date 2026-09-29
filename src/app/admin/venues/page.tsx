import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { VenueForm } from "@/components/admin/VenueForm";
import { deleteVenue } from "@/app/admin/actions";

export default async function VenuesAdmin({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string }> }) {
  const { edit, new: isNew } = await searchParams;
  const supabase = await createClient();
  const [{ data: venues }, { data: courts }] = await Promise.all([
    supabase.from("venues").select("*").order("name"),
    supabase.from("courts").select("id, venue_id"),
  ]);
  const editing = venues?.find((v) => v.id === edit);
  const showForm = !!editing || isNew === "1";
  const courtCount = (venueId: string) => (courts ?? []).filter((c) => c.venue_id === venueId).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display font-bold text-[26px]">Venue</h1>
        {showForm ? (
          <Link href="/admin/venues" className="text-sm text-snow/60 no-underline hover:text-volt">Batal</Link>
        ) : (
          <Link href="/admin/venues?new=1" className="btn btn-coral px-4 py-2 text-sm no-underline">+ Tambah Venue</Link>
        )}
      </div>

      {showForm && <VenueForm key={editing?.id ?? "new"} venue={editing} />}

      {!showForm && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-snow/50 uppercase tracking-wide">
                <th className="pb-2 pr-3 font-semibold">Nama</th>
                <th className="pb-2 pr-3 font-semibold">Jumlah court</th>
                <th className="pb-2 pr-3 font-semibold">Status</th>
                <th className="pb-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {(venues ?? []).map((v) => (
                <tr key={v.id} className={`border-t border-snow/10 ${v.id === edit ? "bg-indigo" : ""} ${v.active ? "" : "opacity-50"}`}>
                  <td className="py-2.5 pr-3 font-display font-bold whitespace-nowrap">{v.name}</td>
                  <td className="py-2.5 pr-3 text-snow/70">
                    <Link href={`/admin/venues/${v.id}`} className="text-volt no-underline hover:underline">
                      {courtCount(v.id)} court →
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3 text-snow/70">{v.active ? "Aktif" : "Nonaktif"}</td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2 justify-end">
                      <Link href={`/admin/venues?edit=${v.id}`} className="btn px-3 py-1.5 text-xs no-underline">Edit</Link>
                      <form action={deleteVenue}>
                        <input type="hidden" name="id" value={v.id} />
                        <button className="btn btn-danger px-3 py-1.5 text-xs" type="submit">Hapus</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {venues?.length === 0 && <p className="text-sm text-snow/50 mt-3">Belum ada venue.</p>}
        </div>
      )}
    </div>
  );
}
