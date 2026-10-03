import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import { EventTypeBadge, StatusBadge } from "@/components/ui/Badge";
import { TrashIcon } from "@/components/ui/icons";
import { deleteCompetition } from "@/app/admin/events/actions";
import type { EventStatus, EventType } from "@/lib/database.types";

export type EventRow = { id: string; type: EventType; title: string; format: string; date: string; venue: string; status: EventStatus };

/** Events as a table (desktop) or cards (mobile). */
export function EventList({ rows }: { rows: EventRow[] }) {
  if (!rows.length) return <p className="text-sm text-snow/50 m-0">Belum ada event.</p>;
  return (
    <>
      <table className="hidden md:table w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs text-snow/65 uppercase tracking-table">
            {["Nama event", "Tipe", "Format", "Tanggal", "Venue", "Status", ""].map((h, i) => (
              <th key={i} className="pb-2.5 pr-3 font-semibold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-snow/10">
              <td className="py-2.5 pr-3 font-display font-bold whitespace-nowrap">{r.title}</td>
              <td className="py-2.5 pr-3"><EventTypeBadge type={r.type} /></td>
              <td className="py-2.5 pr-3 text-snow/80 whitespace-nowrap">{r.format}</td>
              <td className="py-2.5 pr-3 text-snow/80 whitespace-nowrap">{r.date}</td>
              <td className="py-2.5 pr-3 text-snow/80 whitespace-nowrap">{r.venue}</td>
              <td className="py-2.5 pr-3"><StatusBadge status={r.status} /></td>
              <td className="py-2"><RowActions r={r} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="md:hidden flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.id} className="bg-ink-3 rounded-card py-3.5 pl-4 pr-2 flex items-center gap-3">
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="font-display font-bold text-base">{r.title}</div>
              <div className="text-caption leading-copy text-snow/70">
                <div className="flex gap-1.5 mt-0.5 mb-1">
                  <EventTypeBadge type={r.type} />
                  <StatusBadge status={r.status} />
                </div>
                {r.format} · {r.date}
              </div>
            </div>
            <RowActions r={r} />
          </div>
        ))}
      </div>
    </>
  );
}

function RowActions({ r }: { r: EventRow }) {
  return (
    <div className="flex items-center gap-0.5 md:gap-1 justify-end flex-none">
      <Link href={`/admin/events/${r.id}`} className="btn min-h-10 px-4.5 py-2.5 tracking-button no-underline text-snow whitespace-nowrap">Buka</Link>
      <ActionForm action={deleteCompetition} danger confirmText={`Hapus event "${r.title}"? Semua tim, match, dan poin event ini ikut terhapus.`}>
        <input type="hidden" name="event_id" value={r.id} />
        <button type="submit" aria-label={`Hapus ${r.title}`} className="w-10 h-10 rounded-lg bg-transparent border-none text-snow/70 hover:text-loss flex items-center justify-center p-0">
          <TrashIcon />
        </button>
      </ActionForm>
    </div>
  );
}
