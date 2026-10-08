"use client";

import { useState } from "react";
import type { EventItem, EventMatchesData } from "@/lib/events";
import { UnitScheduleModal } from "@/components/jadwal/UnitScheduleModal";

export function KlasemenTab({
  event,
  matches,
}: {
  event: EventItem;
  matches: EventMatchesData | null;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const openUnit = openKey ? matches?.unitSchedules?.[openKey] : null;
  const groups = matches?.groups || [];

  if (groups.length === 0) {
    return (
      <section className="border-2 border-dashed border-ink/20 rounded-2xl p-9 md:p-12 text-center text-ink flex flex-col gap-2 items-center bg-white/40">
        <div className="font-display font-bold text-[19px]">Grup belum diundi</div>
        <p className="text-[15px] leading-relaxed text-ink/70 max-w-lg m-0">
          Pembagian grup dan klasemen akan muncul setelah pendaftaran ditutup dan drawing selesai dilakukan.
        </p>
      </section>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {groups.map((grp, idx) => (
        <section
          key={idx}
          className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-2.5 text-ink shadow-xs"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display font-bold text-[19px] m-0">{grp.name}</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-6" />
                <col />
                <col className="w-12" />
                <col className="w-12" />
                <col className="w-14 hidden sm:table-column" />
              </colgroup>
              <thead>
                <tr>
                  <th className="p-0 pr-1 pb-2 text-[11px] font-bold text-ink/55 uppercase tracking-[0.04em] text-left whitespace-nowrap">
                    #
                  </th>
                  <th className="p-0 pr-2 pb-2 text-[11px] font-bold text-ink/55 uppercase tracking-[0.04em] text-left whitespace-nowrap">
                    {event.type === "kompetisi" ? "Tim" : "Pemain"}
                  </th>
                  <th className="p-0 pr-1 pb-2 text-[11px] font-bold text-ink/55 uppercase tracking-[0.04em] text-center whitespace-nowrap">
                    Poin
                  </th>
                  <th className="p-0 pr-1 pb-2 text-[11px] font-bold text-ink/55 uppercase tracking-[0.04em] text-center whitespace-nowrap">
                    W–L
                  </th>
                  <th className="p-0 pb-2 text-[11px] font-bold text-ink/55 uppercase tracking-[0.04em] text-center whitespace-nowrap hidden sm:table-cell">
                    Selisih
                  </th>
                </tr>
              </thead>
              <tbody>
                {grp.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-t border-ink/7">
                    <td className="py-2.5 pr-1 font-display font-bold text-ink/55">
                      {row.rank}
                    </td>
                    <td className="py-2.5 pr-2 min-w-0">
                      <span className="flex items-center gap-1.5 min-w-0">
                        {row.key && matches?.unitSchedules?.[row.key] ? (
                          <button
                            type="button"
                            onClick={() => setOpenKey(row.key!)}
                            className="font-bold text-sm text-ink hover:underline underline-offset-2 truncate min-w-0"
                          >
                            {row.team}
                          </button>
                        ) : (
                          <span className="font-bold text-sm text-ink truncate min-w-0">{row.team}</span>
                        )}
                        {row.qualified && (
                          <span className="flex-none rounded-full px-2 py-0.5 text-[11px] font-bold bg-[#2f9e5c]/14 text-[#23794A] whitespace-nowrap">
                            {row.qualified}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 pr-1 text-center font-display font-bold text-ink whitespace-nowrap">
                      {row.points}
                    </td>
                    <td className="py-2.5 pr-1 text-center text-ink/70 whitespace-nowrap">
                      {row.wl}
                    </td>
                    <td className="py-2.5 text-center text-ink/70 whitespace-nowrap hidden sm:table-cell">
                      {row.diff}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {openUnit && <UnitScheduleModal name={openUnit.name} rows={openUnit.rows} onClose={() => setOpenKey(null)} />}
    </div>
  );
}
