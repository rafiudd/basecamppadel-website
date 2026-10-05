import Link from "next/link";
import type { Court } from "@/lib/database.types";
import { upsertCourt } from "@/app/admin/actions";

/** "Tambah court" card on the venue page; with `court` it edits that court instead. */
export function CourtForm({ court, venueId, nextName }: { court?: Court; venueId: string; nextName?: string }) {
  return (
    <form action={upsertCourt} className="bg-ink-2 rounded-2xl p-5 flex flex-col gap-3 md:flex-row md:items-end">
      {court && <input type="hidden" name="id" value={court.id} />}
      <input type="hidden" name="venue_id" value={venueId} />
      <label className="flex-1 block">
        <span className="label block">{court ? "Edit court" : "Tambah court"}</span>
        <input className="field min-h-11" name="name" required defaultValue={court?.name} placeholder={nextName ?? "Court 1"} />
      </label>
      <label className="flex items-center gap-2 text-sm min-h-11">
        <input type="checkbox" name="active" defaultChecked={court?.active ?? true} className="w-4.5 h-4.5 accent-volt" /> Aktif
      </label>
      <div className="flex items-center gap-2">
        {court && <Link href={`/admin/venues/${venueId}`} className="btn bg-transparent text-snow/85 no-underline min-h-10">Batal</Link>}
        <button className="btn btn-coral text-ink min-h-10 tracking-button whitespace-nowrap flex-1 md:flex-none" type="submit">{court ? "Simpan" : "+ Tambah Court"}</button>
      </div>
    </form>
  );
}
