"use client";

import { useState } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { Modal } from "@/components/ui/Modal";
import { CheckboxField, Field, inputClass } from "@/components/ui/Field";
import { updateCompetition } from "@/app/admin/events/actions";
import { courtLabel, formatRupiah } from "@/lib/format";
import { courtRentalCost, dayOfWeekFromDateStr } from "@/lib/venuePricing";
import type { CompEvent, Court, Venue, CourtHourRate } from "@/lib/database.types";

/** Edit name, date/time, venue + courts, and visibility of an event. */
export function EditEventModal({
  event,
  venues,
  courts,
  hourRates,
  onClose,
}: {
  event: CompEvent;
  venues: Venue[];
  courts: Court[];
  hourRates: CourtHourRate[];
  onClose: () => void;
}) {
  const [venueId, setVenueId] = useState(event.venue_id ?? "");
  const [eventDate, setEventDate] = useState(event.event_date ?? "");
  const [startTime, setStartTime] = useState(event.start_time?.slice(0, 5) ?? "");
  const [durationHours, setDurationHours] = useState(String(event.duration_hours || 2));
  const venueCourts = courts.filter((c) => c.venue_id === venueId);
  // the court checkboxes below are uncontrolled, so this estimate uses the event's saved courts
  // (or every court of the venue, once the venue itself has just been changed) as an approximation
  const estimateCourts = venueCourts.filter((c) => event.court_ids.includes(c.id));
  const estimate = eventDate && startTime && (estimateCourts.length || venueCourts.length)
    ? courtRentalCost({
        courts: (estimateCourts.length ? estimateCourts : venueCourts).map((c) => ({ basePricePerHour: c.price_per_hour || 0, rates: hourRates.filter((r) => r.court_id === c.id) })),
        dayOfWeek: dayOfWeekFromDateStr(eventDate),
        startTime,
        durationHours: Number(durationHours) || 0,
      })
    : null;
  return (
    <Modal title="Edit event" onClose={onClose} width={520}>
      <ActionForm
        action={async (state, fd) => {
          const res = await updateCompetition(state, fd);
          if (!res?.error) onClose();
          return res;
        }}
        successText="Event diperbarui"
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="event_id" value={event.id} />
        {/* present-but-empty, so clearing every court / unpublishing is saved too */}
        <input type="hidden" name="court_ids" value="" />
        <input type="hidden" name="published" value="" />
        <Field label="Nama event">
          <input name="title" defaultValue={event.title} required className="field" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal">
            <input type="date" name="event_date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="field scheme-dark" />
          </Field>
          <Field label="Jam">
            <input type="time" name="start_time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="field scheme-dark" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Durasi (jam)">
            <input type="number" min={0.5} step={0.5} name="duration_hours" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} className={inputClass} />
          </Field>
          <Field label={`Harga pendaftaran per ${event.type === "mabar" ? "pemain" : "tim"} (Rp)`}>
            <input type="number" min={0} step={1000} name="price_amount" defaultValue={event.price_amount || ""} placeholder="50000" className={inputClass} />
          </Field>
        </div>
        {estimate !== null && (
          <div className="rounded-xl bg-snow/6 px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-sm text-snow/75">Estimasi modal sewa lapangan</span>
            <span className="font-display font-bold text-lg">{formatRupiah(estimate)}</span>
          </div>
        )}
        <Field label="Venue">
          <select name="venue_id" value={venueId} onChange={(e) => setVenueId(e.target.value)} className="field">
            <option value="">— pilih venue —</option>
            {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </Field>
        {venueCourts.length > 0 && (
          <div>
            <div className="label">Court dipakai</div>
            <div className="flex gap-2 flex-wrap">
              {venueCourts.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded-full bg-snow/8 px-3.5 py-2 text-sm font-semibold cursor-pointer has-[:checked]:bg-volt has-[:checked]:text-indigo">
                  <input type="checkbox" name="court_ids" value={c.id} defaultChecked={event.court_ids.includes(c.id)} className="sr-only" />
                  {courtLabel(c.name)}
                </label>
              ))}
            </div>
          </div>
        )}
        {venueCourts.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <div className="label">Link YouTube per court</div>
            {venueCourts.map((c) => (
              <Field key={c.id} label={courtLabel(c.name)}>
                <input
                  name={`stream_url:${c.id}`}
                  defaultValue={event.court_stream_urls?.[c.id] ?? ""}
                  placeholder="https://youtube.com/watch?v=..."
                  className="field"
                />
              </Field>
            ))}
          </div>
        )}
        <CheckboxField name="published" defaultChecked={event.published}>Tampilkan di halaman Jadwal publik</CheckboxField>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn">Batal</button>
          <button type="submit" className="btn btn-coral text-ink">Simpan</button>
        </div>
      </ActionForm>
    </Modal>
  );
}
