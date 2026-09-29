import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CourtForm } from "@/components/admin/CourtForm";
import { deleteCourt } from "@/app/admin/actions";

export default async function VenueDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string; new?: string }>;
}) {
  const { id } = await params;
  const { edit, new: isNew } = await searchParams;
  const supabase = await createClient();

  const [{ data: venue }, { data: courts }] = await Promise.all([
    supabase.from("venues").select("*").eq("id", id).maybeSingle(),
    supabase.from("courts").select("*").eq("venue_id", id).order("name"),
  ]);
  if (!venue) notFound();

  const editing = courts?.find((c) => c.id === edit);
  const showForm = !!editing || isNew === "1";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/venues" className="text-sm text-snow/60 no-underline hover:text-volt">← Venue</Link>
        <h1 className="font-display font-bold text-[26px] mt-1">{venue.name}</h1>
        <div className="text-sm text-snow/60">{venue.active ? "Aktif" : "Nonaktif"}</div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="font-display font-bold text-lg">Court</div>
        {showForm ? (
          <Link href={`/admin/venues/${id}`} className="text-sm text-snow/60 no-underline hover:text-volt">Batal</Link>
        ) : (
          <Link href={`/admin/venues/${id}?new=1`} className="btn btn-coral px-4 py-2 text-sm no-underline">+ Tambah Court</Link>
        )}
      </div>

      {showForm && <CourtForm key={editing?.id ?? "new"} court={editing} venueId={id} />}

      {!showForm && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-snow/50 uppercase tracking-wide">
                <th className="pb-2 pr-3 font-semibold">Nama</th>
                <th className="pb-2 pr-3 font-semibold">Status</th>
                <th className="pb-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {(courts ?? []).map((c) => (
                <tr key={c.id} className={`border-t border-snow/10 ${c.active ? "" : "opacity-50"}`}>
                  <td className="py-2.5 pr-3 font-display font-bold whitespace-nowrap">{c.name}</td>
                  <td className="py-2.5 pr-3 text-snow/70">{c.active ? "Aktif" : "Nonaktif"}</td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2 justify-end">
                      <Link href={`/admin/venues/${id}?edit=${c.id}`} className="btn px-3 py-1.5 text-xs no-underline">Edit</Link>
                      <form action={deleteCourt}>
                        <input type="hidden" name="id" value={c.id} />
                        <button className="btn btn-danger px-3 py-1.5 text-xs" type="submit">Hapus</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {courts?.length === 0 && <p className="text-sm text-snow/50 mt-3">Belum ada court di venue ini.</p>}
        </div>
      )}
    </div>
  );
}
