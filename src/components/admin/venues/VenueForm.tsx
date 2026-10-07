import { ActionForm } from "@/components/admin/ActionForm";
import type { Venue } from "@/lib/database.types";
import { upsertVenue } from "@/app/admin/actions";

export function VenueForm({ venue }: { venue?: Venue }) {
  return (
    <ActionForm action={upsertVenue} successText="Venue tersimpan" className="bg-ink-2 rounded-2xl p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      {venue && <input type="hidden" name="id" value={venue.id} />}
      <div>
        <div className="label">Nama venue</div>
        <input className="field" name="name" required defaultValue={venue?.name} placeholder="Padel Hubz" />
      </div>
      <label className="flex items-center gap-2 text-sm self-end pb-2">
        <input type="checkbox" name="active" defaultChecked={venue?.active ?? true} /> Aktif
      </label>
      <div className="md:col-span-2 flex justify-end">
        <button className="btn btn-coral" type="submit">{venue ? "Simpan" : "Tambah Venue"}</button>
      </div>
    </ActionForm>
  );
}
