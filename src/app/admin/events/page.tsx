import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { Badge, StatusBadge } from "@/components/comp/CompViews";
import { deleteCompetition } from "@/app/admin/events/actions";
import { formatSessionDay } from "@/lib/format";
import { STAGE_LABEL } from "@/lib/competition";
import type { EventStatus } from "@/lib/database.types";

type Row = {
  key: string;
  id: string;
  type: "mabar" | "kompetisi";
  title: string;
  format: string;
  date: string;
  venue: string;
  status: EventStatus;
  href: string;
};

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="4 7 20 7" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

export default async function EventsAdmin({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const supabase = await createClient();
  const [{ data: events }, { data: venues }] = await Promise.all([
    supabase.from("events").select("*").order("created_at", { ascending: false }),
    supabase.from("venues").select("id, name"),
  ]);

  const rows: Row[] = (events ?? []).map((e) => ({
    key: `k-${e.id}`,
    id: e.id,
    type: "kompetisi" as const,
    title: e.title,
    format: `Fase grup + ${STAGE_LABEL[e.ko_start]}`,
    date: e.event_date ? formatSessionDay(e.event_date) : "—",
    venue: venues?.find((v) => v.id === e.venue_id)?.name ?? "—",
    status: e.status,
    href: `/admin/events/${e.id}`,
  }));
  const filter = type === "kompetisi" ? "kompetisi" : "semua";
  const shown = filter === "semua" ? rows : rows.filter((r) => r.type === filter);
  const tabs = [
    { id: "semua", label: "Semua", n: rows.length },
    { id: "kompetisi", label: "Kompetisi", n: rows.filter((r) => r.type === "kompetisi").length },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display font-bold text-[26px] m-0">Event</h1>
          <p className="text-sm text-snow/70 m-0">Semua mabar dan kompetisi. Live match dan link OBS selalu nempel ke satu event.</p>
        </div>
        <Link href="/admin/events/new" className="btn btn-coral no-underline text-ink">+ Buat Event</Link>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={t.id === "semua" ? "/admin/events" : `/admin/events?type=${t.id}`}
            className={`no-underline rounded-full px-4 py-2.5 text-sm font-semibold ${filter === t.id ? "bg-indigo text-snow" : "bg-ink-3 text-snow/80"}`}
          >
            {t.label} {t.n}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-snow/65 uppercase tracking-wide">
              <th className="pb-2.5 pr-3 font-semibold">Nama event</th>
              <th className="pb-2.5 pr-3 font-semibold">Tipe</th>
              <th className="pb-2.5 pr-3 font-semibold">Format</th>
              <th className="pb-2.5 pr-3 font-semibold">Tanggal</th>
              <th className="pb-2.5 pr-3 font-semibold">Venue</th>
              <th className="pb-2.5 pr-3 font-semibold">Status</th>
              <th className="pb-2.5" />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.key} className="border-t border-snow/10">
                <td className="py-2.5 pr-3 whitespace-nowrap">
                  <Link href={r.href} className="font-display font-bold text-snow no-underline hover:text-volt">{r.title}</Link>
                </td>
                <td className="py-2.5 pr-3">{r.type === "kompetisi" ? <Badge tone="coral">Kompetisi</Badge> : <Badge tone="volt">Mabar</Badge>}</td>
                <td className="py-2.5 pr-3 text-snow/80 whitespace-nowrap">{r.format}</td>
                <td className="py-2.5 pr-3 text-snow/80 whitespace-nowrap">{r.date}</td>
                <td className="py-2.5 pr-3 text-snow/80 whitespace-nowrap">{r.venue}</td>
                <td className="py-2.5 pr-3"><StatusBadge status={r.status} /></td>
                <td className="py-2">
                  <div className="flex items-center justify-end">
                    <ActionForm action={deleteCompetition} confirmText={`Hapus event "${r.title}"? Semua tim, match, dan poin event ini ikut terhapus.`}>
                      <input type="hidden" name="event_id" value={r.id} />
                      <button type="submit" aria-label={`Hapus ${r.title}`} className="w-10 h-10 rounded-lg bg-transparent border-none text-snow/70 hover:text-loss flex items-center justify-center"><TrashIcon /></button>
                    </ActionForm>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="text-sm text-snow/50 mt-3">Belum ada event.</p>}
      </div>
    </div>
  );
}
