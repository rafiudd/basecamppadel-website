"use client";

import { useState } from "react";
import { courtNameOf } from "@/lib/compData";
import { mabarProgress, mabarTable, unitSchedule, type MabarData } from "@/lib/mabar";
import { CourtScoreCard } from "./CourtScoreCard";
import { MabarStandings } from "./MabarStandings";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { RoundActions } from "./RoundActions";
import { RoundPicker } from "./RoundPicker";
import { UnitScheduleModal } from "./UnitScheduleModal";

/** Mabar event page body: attendance, rounds with a card per court, next-step actions, and the table. */
export function MabarDetail({ data }: { data: MabarData }) {
  const { event, participants, rounds, matches, live, courts, players, presetName } = data;
  const progress = mabarProgress(rounds, matches, event.rounds);
  // open on the first round that still has an unfinished court
  const current = rounds.find((r) => matches.some((m) => m.round_id === r.id && (m.team_a_points == null || m.team_b_points == null))) ?? rounds.at(-1);
  const [selected, setSelected] = useState(current?.round_no ?? 1);
  const [detailKey, setDetailKey] = useState<string | null>(null);

  const nameById = new Map(participants.map((p) => [p.id, p.display_name]));
  const pairName = (ids: string[]) => ids.map((id) => nameById.get(id) ?? "?").join(" & ");
  const round = rounds.find((r) => r.round_no === selected);
  const roundMatches = round ? matches.filter((m) => m.round_id === round.id) : [];
  const playing = new Set(roundMatches.flatMap((m) => [...m.team_a_participant_ids, ...m.team_b_participant_ids]));
  const resting = round ? participants.filter((p) => p.active && p.checked_in && !playing.has(p.id)) : [];

  const table = mabarTable(participants, matches, event.mabar_format, event.draw_seed);
  const detailRow = detailKey ? table.find((r) => r.key === detailKey) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-main-aside gap-6 items-start">
      <div className="flex flex-col gap-4 min-w-0">
        <ParticipantsPanel event={event} participants={participants} players={players} started={rounds.length > 0} defaultOpen={rounds.length === 0} />

        {rounds.length > 0 && (
          <>
            <div className="font-display font-bold text-xl">
              Ronde {selected} <span className="font-sans font-medium text-sm text-snow/70">dari {event.rounds}</span>
            </div>
            <RoundPicker total={event.rounds} existing={rounds.map((r) => r.round_no)} selected={selected} onSelect={setSelected} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {roundMatches.map((m, i) => (
                <CourtScoreCard
                  key={`${m.id}:${m.team_a_points}:${m.team_b_points}`} // fresh inputs when the score changes elsewhere (Skor Cepat)
                  eventId={event.id}
                  m={m}
                  live={live[m.id]}
                  court={(m.court_id ? courtNameOf(courts, m.court_id) : `Court ${i + 1}`).toUpperCase()}
                  teamA={pairName(m.team_a_participant_ids)}
                  teamB={pairName(m.team_b_participant_ids)}
                  locked={event.status === "finished"}
                />
              ))}
            </div>
            {resting.length > 0 && <div className="text-caption text-snow/70">Istirahat ronde ini (0 game): {resting.map((p) => p.display_name).join(", ")}</div>}
          </>
        )}

        <RoundActions event={event} progress={progress} checkedIn={participants.filter((p) => p.active && p.checked_in)} />
      </div>

      <MabarStandings rows={table} doneRounds={progress.doneRounds} rankCount={event.mabar_points.ranks.length} presetName={presetName} onSelect={setDetailKey} />

      {detailRow && (
        <UnitScheduleModal
          name={detailRow.name}
          rows={unitSchedule(detailRow.key, participants, rounds, matches, event.mabar_format)}
          courts={courts}
          onClose={() => setDetailKey(null)}
        />
      )}
    </div>
  );
}
