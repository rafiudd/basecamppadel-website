import Link from "next/link";
import { CheckboxField, Field, inputClass, invalidIf, labelClass } from "@/components/ui/Field";
import { courtLabel, formatRupiah } from "@/lib/format";
import { courtRentalCost, dayOfWeekFromDateStr } from "@/lib/venuePricing";
import type { Venue, CourtHourRate } from "@/lib/database.types";
import type { EventWizard, PresetSummary } from "./useEventWizard";
import { StepSection } from "./parts";

/** Name, date/time, venue + courts, point preset, visibility. Fields carry `name` for the submit form. */
export function StepDetail({
  w,
  venues,
  presets,
  hourRates,
}: {
  w: EventWizard;
  venues: Venue[];
  presets: PresetSummary[];
  hourRates: CourtHourRate[];
}) {
  const d = w.details;
  /** Input props: base style, plus the red outline and aria-invalid when this field is missing. */
  const bad = (field: string) => ({ "aria-invalid": w.invalid(field), className: `${inputClass} ${invalidIf(w.invalid(field))}` });

  const selectedCourts = d.venueCourts.filter((c) => d.courtIds.includes(c.id));
  const estimate = d.eventDate && d.startTime && selectedCourts.length
    ? courtRentalCost({
        courts: selectedCourts.map((c) => ({ basePricePerHour: c.price_per_hour || 0, rates: hourRates.filter((r) => r.court_id === c.id) })),
        dayOfWeek: dayOfWeekFromDateStr(d.eventDate),
        startTime: d.startTime,
        durationHours: Number(d.durationHours) || 0,
      })
    : null;

  return (
    <StepSection title="Detail & poin">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nama event" className="md:col-span-2">
          <input name="title" required value={d.title} onChange={(e) => d.setTitle(e.target.value)} placeholder={w.isMabar ? "Mabar Rutin Minggu" : "Basecamp Battle"} {...bad("title")} />
        </Field>
        <Field label="Tanggal">
          <input type="date" name="event_date" value={d.eventDate} onChange={(e) => d.setEventDate(e.target.value)} {...bad("eventDate")} />
        </Field>
        <Field label="Jam">
          <input type="time" name="start_time" value={d.startTime} onChange={(e) => d.setStartTime(e.target.value)} {...bad("startTime")} />
        </Field>
        <Field label="Durasi (jam)">
          <input type="number" min={0.5} step={0.5} name="duration_hours" value={d.durationHours} onChange={(e) => d.setDurationHours(e.target.value)} className={inputClass} />
        </Field>
        <Field label={`Harga pendaftaran per ${w.isMabar ? "pemain" : "tim"} (Rp)`}>
          <input type="number" min={0} step={1000} name="price_amount" value={d.priceAmount} onChange={(e) => d.setPriceAmount(e.target.value)} placeholder="50000" className={inputClass} />
        </Field>
        <Field label="Venue">
          <select name="venue_id" value={d.venueId} onChange={(e) => d.setVenueId(e.target.value)} {...bad("venueId")}>
            <option value="">— pilih venue —</option>
            {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </Field>
        <div>
          <div className={labelClass}>Court dipakai</div>
          <div className={`flex gap-1.5 flex-wrap rounded-xl ${w.invalid("courts") ? `p-1.5 ${invalidIf(true)}` : ""}`}>
            {d.venueCourts.map((c) => {
              const on = d.courtIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => d.toggleCourt(c.id)}
                  className={`border-none rounded-full min-h-10 px-3.5 py-2 text-sm font-semibold ${on ? "bg-volt text-indigo" : "bg-snow/10 text-snow"}`}
                >
                  {courtLabel(c.name)}
                </button>
              );
            })}
            {!d.venueCourts.length && <span className="text-caption text-snow/60 py-2.5">{d.venueId ? "Venue ini belum punya court." : "Pilih venue dulu."}</span>}
          </div>
          {d.courtIds.map((id) => <input key={id} type="hidden" name="court_ids" value={id} />)}
        </div>
      </div>
      {estimate !== null && (
        <div className="rounded-xl bg-snow/6 px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm text-snow/75">Estimasi modal sewa lapangan</span>
          <span className="font-display font-bold text-lg">{formatRupiah(estimate)}</span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div>
          <Field label="Preset poin leaderboard">
            <select name="point_preset_id" value={d.presetId} onChange={(e) => d.setPresetId(e.target.value)} {...bad("presetId")}>
              <option value="">— pilih preset —</option>
              {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Link href="/admin/point" className="inline-block mt-2 text-caption text-volt no-underline">Atur preset di menu Poin →</Link>
        </div>
        <CheckboxField name="published" checked={d.published} onChange={(e) => d.setPublished(e.target.checked)}>
          Tampilkan di halaman Jadwal publik
        </CheckboxField>
      </div>
    </StepSection>
  );
}
