import type { Session } from "@/lib/database.types";
import { upsertSession } from "@/app/admin/actions";

export function SessionForm({ session }: { session?: Session }) {
  return (
    <form action={upsertSession} className="bg-indigo rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      {session && <input type="hidden" name="id" value={session.id} />}
      <div className="md:col-span-2">
        <div className="label">Judul</div>
        <input className="field" name="title" required defaultValue={session?.title} placeholder="Basecamp Battle #1" />
      </div>
      <div>
        <div className="label">Tag</div>
        <input className="field" name="tag" defaultValue={session?.tag ?? "Sesi Padel · Mabar"} />
      </div>
      <div>
        <div className="label">Venue</div>
        <input className="field" name="venue" required defaultValue={session?.venue} placeholder="Padel Hubz" />
      </div>
      <div>
        <div className="label">Tanggal</div>
        <input className="field" name="session_date" type="date" required defaultValue={session?.session_date} />
      </div>
      <div>
        <div className="label">Jam</div>
        <input className="field" name="time_range" defaultValue={session?.time_range} placeholder="16.00–20.00" />
      </div>
      <div>
        <div className="label">Harga</div>
        <input className="field" name="price" defaultValue={session?.price} placeholder="Rp 50.000" />
      </div>
      <div>
        <div className="label">Slot</div>
        <input className="field" name="slots" type="number" min={0} defaultValue={session?.slots ?? ""} />
      </div>
      <div className="md:col-span-2">
        <div className="label">Link WhatsApp</div>
        <input className="field" name="whatsapp_url" type="url" defaultValue={session?.whatsapp_url ?? ""} placeholder="https://wa.me/62..." />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="published" defaultChecked={session?.published ?? true} /> Tampilkan di halaman Jadwal
      </label>
      <div className="flex justify-end gap-2">
        <button className="btn btn-coral" type="submit">{session ? "Simpan" : "Tambah Sesi"}</button>
      </div>
    </form>
  );
}
