import type { Court } from "@/lib/database.types";
import { createEvent } from "@/app/admin/generator/actions";

const FORMATS: { value: string; label: string }[] = [
  { value: "americano", label: "Americano (partner acak tiap ronde)" },
  { value: "mexicano", label: "Mexicano (partner acak, di-seed dari ranking)" },
  { value: "fixed_americano", label: "Fixed Partner Americano (partner tetap, lawan gantian acak)" },
  { value: "fixed_mexicano", label: "Fixed Partner Mexicano (partner tetap, lawan di-seed dari ranking)" },
];

export function GenEventForm({ courts }: { courts: Court[] }) {
  return (
    <form action={createEvent} className="bg-indigo rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <div className="label">Judul event</div>
        <input className="field" name="title" placeholder="Mabar Minggu Pagi" />
      </div>
      <div className="md:col-span-2">
        <div className="label">Format</div>
        <select className="field" name="format" required defaultValue="americano">
          {FORMATS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>
      <div>
        <div className="label">Target poin per match (info aja)</div>
        <input className="field" name="points_target" type="number" defaultValue={24} />
      </div>
      <div>
        <div className="label">Court yang dipakai</div>
        <select className="field" name="court_ids" multiple size={Math.min(5, Math.max(3, courts.length))}>
          {courts.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="text-[11px] text-snow/40 mt-1">Ctrl/Cmd+klik buat pilih lebih dari satu. Kosong = 1 court virtual.</div>
      </div>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" name="sync_to_leaderboard" /> Poin hasil event ini ditambahkan ke leaderboard utama saat difinalisasi
      </label>
      <div className="md:col-span-2 flex justify-end">
        <button className="btn btn-coral" type="submit">Buat Event</button>
      </div>
    </form>
  );
}
