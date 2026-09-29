import type { Court, Venue } from "@/lib/database.types";
import { upsertCourt } from "@/app/admin/actions";

export function CourtForm({ court, venues }: { court?: Court; venues: Venue[] }) {
  return (
    <form action={upsertCourt} className="bg-indigo rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      {court && <input type="hidden" name="id" value={court.id} />}
      <div>
        <div className="label">Nama court</div>
        <input className="field" name="name" required defaultValue={court?.name} placeholder="Court 1" />
      </div>
      <div>
        <div className="label">Venue</div>
        <select className="field" name="venue_id" required defaultValue={court?.venue_id ?? ""}>
          {!court?.venue_id && <option value="" disabled>— pilih venue —</option>}
          {venues.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
        {venues.length === 0 && (
          <div className="text-[11px] text-loss mt-1">Belum ada venue — tambah dulu di menu Venue.</div>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={court?.active ?? true} /> Aktif
      </label>
      <div className="md:col-span-2 flex justify-end">
        <button className="btn btn-coral" type="submit">{court ? "Simpan" : "Tambah Court"}</button>
      </div>
    </form>
  );
}
