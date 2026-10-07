import { ActionForm } from "@/components/admin/ActionForm";
import type { Session, Venue } from "@/lib/database.types";
import { upsertSession } from "@/app/admin/actions";
import { parseTimeRange } from "@/lib/format";

export function SessionForm({ session, venues }: { session?: Session; venues: Venue[] }) {
  const { start, end } = parseTimeRange(session?.time_range ?? "");
  return (
    <ActionForm action={upsertSession} successText="Sesi tersimpan" className="bg-indigo rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <select className="field" name="venue" required defaultValue={session?.venue ?? ""}>
          {!session?.venue && <option value="" disabled>— pilih venue —</option>}
          {venues.map((v) => (
            <option key={v.id} value={v.name}>{v.name}</option>
          ))}
        </select>
      </div>
      <div>
        <div className="label">Tanggal</div>
        <input className="field" name="session_date" type="date" required defaultValue={session?.session_date} />
      </div>
      <div>
        <div className="label">Jam mulai</div>
        <input className="field" name="start_time" type="time" required defaultValue={start} />
      </div>
      <div>
        <div className="label">Jam selesai</div>
        <input className="field" name="end_time" type="time" defaultValue={end} />
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
    </ActionForm>
  );
}
