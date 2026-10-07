"use client";

import { ActionForm } from "@/components/admin/ActionForm";
import { Badge } from "@/components/ui/Badge";
import { CheckIcon } from "@/components/ui/icons";
import { startMatch } from "@/app/admin/events/live-actions";
import { OnAirSwitch } from "@/components/admin/event/OnAirSwitch";
import { findStartConflict } from "@/lib/matchRules";
import { awaitingTeams, matchName, matchTeams } from "@/lib/compLabels";
import { courtNameOf, type CompetitionData } from "@/lib/compData";
import type { Match } from "@/lib/database.types";
import { SlotControls } from "./SlotControls";

/** One match: both teams with score, court + time, and Edit skor / ON AIR switch + Isi skor / Menunggu / Mulai. */
export function MatchRow({ m, label, data, onEditScore }: { m: Match; label: string; data: CompetitionData; onEditScore: () => void }) {
  const done = m.status === "finished";
  const showScore = (done && !m.is_wo) || m.status === "live";
  const winA = done && m.winner_team_id === m.team_a_id;
  const winB = done && m.winner_team_id === m.team_b_id;
  const names = matchTeams(m, data.matches);

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-2.5 md:gap-4 py-3 border-t border-snow/8">
      <div className="flex-none md:w-21 text-xs font-bold text-snow/70">
        {label}
        {m.is_wo && <span className="ml-1.5 text-coral-soft">WO</span>}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <TeamScoreLine name={names.a} score={showScore ? m.team_a_games : null} winner={winA} loser={winB} pending={!m.team_a_id} />
        <TeamScoreLine name={names.b} score={showScore ? m.team_b_games : null} winner={winB} loser={winA} pending={!m.team_b_id} />
      </div>
      <div className="flex items-center justify-between flex-wrap gap-2 md:contents">
        <SlotControls m={m} data={data} locked={done || m.status === "live"} label={label} />
        <div className="flex-none md:min-w-26 flex justify-end">
          <MatchAction m={m} data={data} label={label} onEditScore={onEditScore} />
        </div>
      </div>
    </div>
  );
}

function MatchAction({ m, data, label, onEditScore }: { m: Match; data: CompetitionData; label: string; onEditScore: () => void }) {
  const eventId = data.event.id;
  const ghost = "btn bg-transparent text-snow/85 min-h-10 px-2.5 py-2 text-caption tracking-button";
  if (m.status === "finished") return <button type="button" onClick={onEditScore} className={ghost}>Edit skor</button>;
  if (m.status === "live") {
    return (
      <div className="flex items-center gap-1.5">
        <OnAirSwitch eventId={eventId} matchId={m.id} on={m.is_live} label={label} />
        <button type="button" onClick={onEditScore} className={ghost}>Isi skor</button>
      </div>
    );
  }
  if (awaitingTeams(m)) return <Badge tone="faint">Menunggu</Badge>;
  return (
    <ActionForm action={startMatch} successText={`${label} dimulai`} confirmText={startWarning(m, data, label)} confirmLabel="Ya, mulai">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="match_id" value={m.id} />
      <button type="submit" className="btn min-h-10 px-3.5 py-2 text-caption tracking-button whitespace-nowrap">Mulai</button>
    </ActionForm>
  );
}

/** Confirmation text before "Mulai" when the court is busy or every court is in use (see findStartConflict). */
function startWarning(m: Match, data: CompetitionData, label: string): string | undefined {
  const conflict = findStartConflict(m, data.matches, data.event.court_ids.length);
  if (!conflict) return undefined;
  if (conflict.kind === "court") return `${courtNameOf(data.courts, m.court_id)} masih dipakai ${matchName(conflict.with, data.matches)} yang sedang berjalan. Tetap mulai ${label}?`;
  return `Sudah ${conflict.running} match berjalan, sedangkan event ini punya ${conflict.courts} court. Tetap mulai ${label}?`;
}

function TeamScoreLine({ name, score, winner, loser, pending }: { name: string; score: number | null; winner: boolean; loser: boolean; pending: boolean }) {
  const nameTone = winner ? "font-bold text-snow" : loser ? "font-medium text-snow/55" : pending ? "font-medium text-snow/65" : "font-medium text-snow";
  return (
    <div className={`flex items-center justify-between gap-2.5 min-h-8 pl-2.5 pr-1 rounded-lg ${winner ? "bg-win/22 shadow-mark-win" : ""}`}>
      <span className="flex items-center gap-2.5 min-w-0">
        <span className={`text-sm truncate ${nameTone}`}>{name}</span>
        {winner && (
          <span className="flex-none inline-flex items-center gap-1 text-2xs font-bold tracking-tag text-win-soft">
            <CheckIcon size={14} strokeWidth={2.6} />
            MENANG
          </span>
        )}
      </span>
      <span className={`flex-none min-w-7.5 px-1.5 box-border h-6.5 rounded-md flex items-center justify-center font-display font-bold text-base ${winner ? "bg-win text-snow" : loser ? "text-snow/55" : "text-snow"}`}>
        {score}
      </span>
    </div>
  );
}
