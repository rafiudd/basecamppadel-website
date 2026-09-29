import type { Court } from "@/lib/database.types";
import { upsertCourt } from "@/app/admin/actions";

export function CourtForm({ court, venueId }: { court?: Court; venueId: string }) {
  return (
    <form action={upsertCourt} className="bg-indigo rounded-2xl p-6 flex flex-col gap-4 md:flex-row md:items-end">
      {court && <input type="hidden" name="id" value={court.id} />}
      <input type="hidden" name="venue_id" value={venueId} />
      <div className="flex-1">
        <div className="label">Nama court</div>
        <input className="field" name="name" required defaultValue={court?.name} placeholder="Court 1" />
      </div>
      <label className="flex items-center gap-2 text-sm pb-2.5">
        <input type="checkbox" name="active" defaultChecked={court?.active ?? true} /> Aktif
      </label>
      <button className="btn btn-coral" type="submit">{court ? "Simpan" : "Tambah Court"}</button>
    </form>
  );
}
