import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import { BracketIcon, CloseIcon } from "@/components/ui/icons";
import { clearGroupSchedule } from "@/app/admin/events/match-actions";
import { groupSizes, KO_ORDER, STAGE_LABEL } from "@/lib/competition";
import type { CompetitionData } from "@/lib/compData";
import type { CompEvent } from "@/lib/database.types";
import { card, type PlayerSummary } from "@/components/admin/event/types";
import { RosterCard } from "./RosterCard";

/** Format summary, roster, and the leaderboard points this event awards. */
export function FormatTab({ data, players, presetName }: { data: CompetitionData; players: PlayerSummary[]; presetName: string | null }) {
  const { event, matches } = data;
  const unplayed = matches.length > 0 && !matches.some((m) => m.status !== "scheduled" && !m.is_bye);
  return (
    <>
      <FormatSummary event={event} />
      <FormatStats event={event} />
      <RosterCard data={data} players={players} />
      <PointsCard event={event} presetName={presetName} />
      {unplayed && (
        <ActionForm action={clearGroupSchedule} danger confirmLabel="Ya, hapus jadwal" confirmText="Hapus semua jadwal dan kembalikan event ke draft? Tim dan grup tetap tersimpan." className="flex justify-end">
          <input type="hidden" name="event_id" value={event.id} />
          <button type="submit" className="btn btn-danger">Hapus jadwal (kembali ke draft)</button>
        </ActionForm>
      )}
    </>
  );
}

function FormatSummary({ event }: { event: CompEvent }) {
  const top = event.advance_per_group === 2 ? "Dua" : `${event.advance_per_group}`;
  return (
    <div className={`${card} px-5 py-4.5 flex gap-4 items-start`}>
      <div className="flex-none w-12 h-12 rounded-xl bg-indigo text-volt flex items-center justify-center">
        <BracketIcon size={26} />
      </div>
      <div>
        <div className="font-display font-bold text-lg">Fase grup + knockout</div>
        <p className="text-sm leading-prose text-snow/75 mt-1 mb-0">
          Tim dibagi ke grup dan main round robin. {top} teratas tiap grup lolos ke bracket gugur mulai {STAGE_LABEL[event.ko_start].toLowerCase()} sampai final.
        </p>
      </div>
    </div>
  );
}

function FormatStats({ event }: { event: CompEvent }) {
  const sizes = groupSizes(event.num_teams, event.num_groups);
  const koRounds = KO_ORDER.length - KO_ORDER.indexOf(event.ko_start);
  const min = Math.max(0, Math.min(...sizes) - 1);
  const max = Math.max(...sizes) - 1 + koRounds;
  const stats: { pre?: string; value: React.ReactNode; label: string }[] = [
    { value: event.num_groups, label: "Grup" },
    { value: `Top ${event.advance_per_group}`, label: "Lolos per grup" },
    { pre: "kira-kira", value: min === max ? min : `${min}–${max}`, label: "Match per tim" },
    { value: <CloseIcon size={30} strokeWidth={2} />, label: "Perebutan juara 3" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className={`${card} px-3.5 py-4.5 flex flex-col items-center justify-center text-center gap-1.5 min-h-35`}>
          {s.pre && <div className="text-xs text-snow/70">{s.pre}</div>}
          <div className="font-display font-bold text-stat leading-stat">{s.value}</div>
          <div className="text-caption leading-label text-snow/75">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function PointsCard({ event, presetName }: { event: CompEvent; presetName: string | null }) {
  const p = event.points;
  const rows = [
    { label: "Preset", value: presetName ?? "Kustom" },
    { label: "Juara", value: p.champion },
    { label: "Runner-up", value: p.runner_up },
    { label: "Semifinal", value: p.sf },
    ...(event.ko_start === "qf" || event.ko_start === "r16" ? [{ label: "8 besar", value: p.qf }] : []),
    ...(event.ko_start === "r16" ? [{ label: "16 besar", value: p.r16 }] : []),
    { label: "Fase grup", value: p.group },
  ];
  return (
    <div className="bg-ink-3 rounded-card px-5 pt-4 pb-1.5">
      <div className="text-xs font-bold tracking-caps text-snow/70 mb-1">POIN LEADERBOARD</div>
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between py-2.5 border-t border-snow/8 text-sm">
          <span className="text-snow/80">{r.label}</span>
          <span className="font-display font-bold">{r.value}</span>
        </div>
      ))}
      <Link href="/admin/point" className="block pt-2.5 pb-3 text-caption font-bold text-volt no-underline">Atur di menu Poin →</Link>
    </div>
  );
}
