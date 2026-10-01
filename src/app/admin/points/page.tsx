import { ActionForm } from "@/components/admin/ActionForm";
import { createClient } from "@/lib/supabase/server";
import { savePointPreset } from "./actions";

const POINT_FIELDS = [
  { key: "champion", label: "Juara", note: "Poin untuk juara event" },
  { key: "runner_up", label: "Runner-up", note: "Poin untuk posisi kedua" },
  { key: "sf", label: "Semifinal", note: "Poin saat mencapai semifinal" },
  { key: "qf", label: "8 Besar", note: "Poin saat mencapai 8 besar" },
  { key: "r16", label: "16 Besar", note: "Poin saat mencapai 16 besar" },
  { key: "group", label: "Fase Grup", note: "Poin untuk ikut serta di fase grup" },
] as const;

const DEFAULT_POINTS = {
  champion: 80,
  runner_up: 50,
  sf: 30,
  qf: 15,
  r16: 10,
  group: 5,
} as const;

export default async function PointsAdmin() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, title, type, points")
    .order("created_at", { ascending: false })
    .limit(20);

  const selected = events?.find((event) => event.type === "kompetisi") ?? events?.[0];
  const points = selected?.points ?? DEFAULT_POINTS;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-[26px] m-0">Preset Poin</h1>
          <p className="m-0 text-sm text-snow/60">
            Atur poin leaderboard yang diberikan saat event selesai.
          </p>
        </div>
        {selected && (
          <div className="rounded-full bg-snow/8 px-3 py-1.5 text-xs font-semibold text-snow/80">
            {selected.title} · {selected.type === "kompetisi" ? "Kompetisi" : "Mabar"}
          </div>
        )}
      </div>

      {!selected ? (
        <div className="bg-ink-3 rounded-2xl p-6 text-sm text-snow/60">
          Belum ada event yang tersimpan. Buat event kompetisi terlebih dahulu untuk mengatur preset poin.
        </div>
      ) : (
        <ActionForm action={savePointPreset} className="bg-ink-3 rounded-2xl p-6 flex flex-col gap-5">
          <input type="hidden" name="event_id" value={selected.id} />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {POINT_FIELDS.map((field) => (
              <label key={field.key} className="bg-ink-2 rounded-xl p-4 border border-snow/5 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-snow">{field.label}</span>
                  <span className="text-[10px] uppercase tracking-wide text-snow/40">pts</span>
                </div>
                <input
                  type="number"
                  min={0}
                  name={`points_${field.key}`}
                  defaultValue={points[field.key as keyof typeof points] ?? 0}
                  className="field text-sm"
                />
                <span className="text-[11px] text-snow/50">{field.note}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-coral px-5 py-2.5 font-bold">
              Simpan Preset Poin
            </button>
          </div>
        </ActionForm>
      )}
    </div>
  );
}
