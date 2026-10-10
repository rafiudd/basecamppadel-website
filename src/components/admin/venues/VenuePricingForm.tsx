"use client";

import { useState } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { DAYS, courtLabel, formatRupiah } from "@/lib/format";
import { upsertCourtHourRates } from "@/app/admin/actions";
import type { Court, CourtHourRate } from "@/lib/database.types";

/** Operating hours shown on the grid (06:00–23:00). Covers normal padel hours; cells outside this
 *  range just use the court's base rate since they're never booked anyway. */
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);
const DAY_SHORT = DAYS.map((d) => d.slice(0, 3));

/** "Harga prime time": a price-per-hour grid, day of week × hour, applied to whichever courts are
 *  checked at the top — a venue whose courts all cost the same only needs this filled in once. The
 *  grid pre-fills from the first checked court's current rates; saving overwrites every checked court
 *  with the same values. A blank cell means "use that court's own base rate" (shown as its placeholder). */
export function VenuePricingForm({ venueId, courts, rates }: { venueId: string; courts: Court[]; rates: CourtHourRate[] }) {
  const [applyTo, setApplyTo] = useState<string[]>(courts.map((c) => c.id));
  const reference = courts.find((c) => c.id === applyTo[0]) ?? courts[0];
  const rateOf = (day: number, hour: number) => rates.find((r) => r.court_id === reference?.id && r.day_of_week === day && r.hour === hour)?.price_per_hour;

  const toggle = (id: string) => setApplyTo((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  if (!courts.length) return null;

  return (
    <ActionForm action={upsertCourtHourRates} successText="Harga prime time tersimpan" className="bg-ink-2 rounded-2xl p-5 md:p-6 flex flex-col gap-3">
      <input type="hidden" name="venue_id" value={venueId} />
      <div>
        <div className="font-display font-bold text-lg">Harga prime time</div>
        <p className="text-sm text-snow/65 m-0 mt-1">
          Isi harga per jam yang beda dari harga normal tiap court. Kosongin sel yang pakai harga normal court itu.
        </p>
      </div>

      <div>
        <div className="label">Berlaku untuk court</div>
        <div className="flex gap-1.5 flex-wrap">
          {courts.map((c) => {
            const on = applyTo.includes(c.id);
            return (
              <label key={c.id} className="flex items-center gap-2 rounded-full bg-snow/8 px-3.5 py-2 text-sm font-semibold cursor-pointer has-[:checked]:bg-volt has-[:checked]:text-indigo">
                <input type="checkbox" name="apply_court_ids" value={c.id} checked={on} onChange={() => toggle(c.id)} className="sr-only" />
                {courtLabel(c.name)} · {formatRupiah(c.price_per_hour)}
              </label>
            );
          })}
        </div>
        {reference && (
          <p className="text-xs text-snow/55 mt-2 mb-0">
            Nilai di bawah ini contoh dari {courtLabel(reference.name)}. Simpan akan menimpa harga prime time semua court yang dicentang di atas dengan nilai yang sama.
          </p>
        )}
      </div>

      <div className="overflow-x-auto -mx-5 md:mx-0 px-5 md:px-0">
        <table key={reference?.id ?? "none"} className="border-collapse text-sm w-full">
          <thead>
            <tr className="text-xs text-snow/65 uppercase tracking-table">
              <th className="sticky left-0 bg-ink-2 pb-2 pr-2 text-left font-semibold">Jam</th>
              {DAY_SHORT.map((d) => (
                <th key={d} className="pb-2 px-1 font-semibold min-w-[88px]">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => (
              <tr key={hour} className="border-t border-snow/10">
                <td className="sticky left-0 bg-ink-2 py-1 pr-2 font-semibold whitespace-nowrap">{String(hour).padStart(2, "0")}:00</td>
                {DAYS.map((_, day) => (
                  <td key={day} className="py-1 px-1">
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      name={`price_${day}_${hour}`}
                      defaultValue={rateOf(day, hour) ?? ""}
                      placeholder={String(reference?.price_per_hour || 0)}
                      className="bg-snow/10 border-none rounded-lg px-2 py-1.5 min-h-9 text-sm text-snow w-full box-border outline-none focus:ring-2 focus:ring-inset focus:ring-volt scheme-dark"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button className="btn btn-coral" type="submit" disabled={!applyTo.length}>Simpan harga prime time</button>
      </div>
    </ActionForm>
  );
}
