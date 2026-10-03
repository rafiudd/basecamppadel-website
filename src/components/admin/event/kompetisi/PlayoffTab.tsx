import { ActionForm } from "@/components/admin/ActionForm";
import { Bracket } from "@/components/comp/Bracket";
import { EmptyState } from "@/components/ui/EmptyState";
import { generateBracket, swapBracketTeams } from "@/app/admin/events/match-actions";
import { seedMap } from "@/lib/compLabels";
import type { CompetitionData } from "@/lib/compData";
import { sectionTitle } from "@/components/admin/event/types";

export function PlayoffTab({ data }: { data: CompetitionData }) {
  const { event, ko, matches, groups } = data;
  return (
    <div className="flex flex-col gap-4">
      <div className={sectionTitle}>Bracket playoff</div>
      {event.bracket_stale && <StaleBracketAlert data={data} />}
      {event.bracket_generated ? (
        <Bracket rounds={ko} all={matches} seeds={seedMap(groups, event.advance_per_group)} courts={data.courts} />
      ) : (
        <EmptyState
          action={
            data.groupStageComplete && (
              <ActionForm action={generateBracket}>
                <input type="hidden" name="event_id" value={event.id} />
                <button type="submit" className="btn btn-coral text-ink">Buat bracket</button>
              </ActionForm>
            )
          }
        >
          {data.groupStageComplete
            ? "Semua match fase grup selesai. Buat bracket knockout dari klasemen akhir."
            : "Bracket bisa dibuat setelah semua match fase grup selesai."}
        </EmptyState>
      )}
      {event.bracket_generated && !data.koStarted && <SwapTeamsForm data={data} />}
    </div>
  );
}

function StaleBracketAlert({ data }: { data: CompetitionData }) {
  return (
    <div className="bg-coral/18 rounded-card px-4.5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <div className="font-bold text-coral-soft">Bracket perlu diperbarui</div>
        <div className="text-caption text-snow/80">Skor fase grup dikoreksi setelah bracket dibuat. Susunan playoff mungkin berubah.</div>
      </div>
      {!data.koStarted && (
        <ActionForm action={generateBracket} confirmLabel="Ya, buat ulang" confirmText="Buat ulang bracket dari klasemen terbaru?">
          <input type="hidden" name="event_id" value={data.event.id} />
          <button type="submit" className="btn btn-coral text-ink">Buat ulang bracket</button>
        </ActionForm>
      )}
    </div>
  );
}

/** Swap two teams' first-round slots, before the knockout starts. */
function SwapTeamsForm({ data }: { data: CompetitionData }) {
  const inFirstRound = new Set((data.ko[0]?.matches ?? []).flatMap((m) => [m.team_a_id, m.team_b_id]).filter(Boolean));
  const teams = data.teams.filter((t) => inFirstRound.has(t.id));
  if (teams.length < 2) return null;
  return (
    <ActionForm action={swapBracketTeams} className="bg-ink-3 rounded-card px-4.5 py-3.5 flex items-end gap-2.5 flex-wrap">
      <input type="hidden" name="event_id" value={data.event.id} />
      <div className="basis-full text-caption font-bold">Tukar posisi tim babak pertama</div>
      {(["team_x", "team_y"] as const).map((n) => (
        <select key={n} name={n} required defaultValue="" className="field text-sm w-full md:w-55">
          <option value="">Pilih tim</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      ))}
      <button type="submit" className="btn min-h-10">Tukar</button>
    </ActionForm>
  );
}
