"use client";

import { ActionForm } from "@/components/admin/ActionForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { createCompetition } from "@/app/admin/events/actions";
import type { Court, Venue } from "@/lib/database.types";
import type { PlayerSummary } from "@/components/admin/event/types";
import { useEventWizard, type EventWizard, type PresetSummary, type Step } from "./useEventWizard";
import { StepType } from "./StepType";
import { StepFormat } from "./StepFormat";
import { StepPeserta } from "./StepPeserta";
import { StepDetail } from "./StepDetail";
import { ErrorText } from "./StepFormat";

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Tipe" },
  { n: 2, label: "Format" },
  { n: 3, label: "Peserta" },
  { n: 4, label: "Detail & poin" },
];

/**
 * Buat Event: Tipe → Format → Peserta → Detail & poin, in order (no skipping ahead). Only the last
 * step is a form; earlier steps post as hidden fields.
 */
export function NewEventWizard({ players, venues, courts, presets }: { players: PlayerSummary[]; venues: Venue[]; courts: Court[]; presets: PresetSummary[] }) {
  const w = useEventWizard({ players, courts });
  const back = w.step > 1 && (
    <button type="button" onClick={() => w.back((w.step - 1) as Step)} className="btn min-h-11">← Kembali</button>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Buat Event" back={{ href: "/admin/events", label: "Event" }} />
      <Stepper w={w} />

      {w.step === 1 && <StepType w={w} />}
      {w.step === 2 && <StepFormat w={w} />}
      {w.step === 3 && <StepPeserta w={w} players={players} />}

      {w.step < 4 ? (
        <>
          <StepErrors messages={w.stepErrors} />
          <div className="flex justify-between gap-2">
            {back || <span />}
            <button type="button" onClick={w.next} className="btn btn-volt min-h-11">Lanjut →</button>
          </div>
        </>
      ) : (
        // the capture handler runs before the form's submit, so an incomplete step 4 never posts
        <div onSubmitCapture={(e) => !w.canSubmit() && e.preventDefault()}>
          <ActionForm action={createCompetition} successText="Event dibuat" className="flex flex-col gap-5">
            <EarlierStepsFields w={w} />
            <StepDetail w={w} venues={venues} presets={presets} />
            <StepErrors messages={w.stepErrors} />
            <div className="flex justify-between gap-2">
              {back}
              <button type="submit" className="btn btn-coral text-ink min-h-11">Buat Event</button>
            </div>
          </ActionForm>
        </div>
      )}
    </div>
  );
}

function StepErrors({ messages }: { messages: string[] }) {
  if (!messages.length) return null;
  return (
    <div role="alert" className="bg-loss/12 rounded-xl px-4 py-3 flex flex-col gap-1">
      {messages.map((m) => <ErrorText key={m}>{m}</ErrorText>)}
    </div>
  );
}

function Stepper({ w }: { w: EventWizard }) {
  return (
    <div className="flex gap-1.5 p-1 rounded-card bg-ink-3">
      {STEPS.map((s) => {
        const on = s.n === w.step;
        const done = s.n < w.step;
        return (
          <button
            key={s.n}
            type="button"
            onClick={() => w.back(s.n)}
            disabled={!done}
            aria-current={on ? "step" : undefined}
            aria-label={`Langkah ${s.n}: ${s.label}`}
            className={`flex-1 basis-0 border-none rounded-tile min-h-12 px-2 py-1.5 text-sm font-bold flex items-center justify-center gap-2 disabled:cursor-default disabled:opacity-100 ${
              on ? "bg-volt text-indigo" : done ? "bg-transparent text-snow" : "bg-transparent text-snow/50"
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-none ${on ? "bg-indigo/15" : "bg-snow/12"}`}>{done ? "✓" : s.n}</span>
            {/* phones show the numbers only; labels from sm up */}
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Steps 1–3 as hidden inputs of the final form (see createCompetition for the fields). */
function EarlierStepsFields({ w }: { w: EventWizard }) {
  if (w.isMabar) {
    return (
      <>
        <input type="hidden" name="event_type" value="mabar" />
        <input type="hidden" name="mabar_format" value={w.mabar.format ?? ""} />
        <input type="hidden" name="rounds" value={w.mabar.rounds} />
        {w.fixed
          ? <input type="hidden" name="teams" value={JSON.stringify(w.teams.filled)} />
          : w.mabar.picked.map((id) => <input key={id} type="hidden" name="player_ids" value={id} />)}
        <input type="hidden" name="quota" value={w.mabar.quota} />
        <input type="hidden" name="score_mode" value={w.mabar.scoreMode} />
        <input type="hidden" name="points_target" value={w.mabar.scoreTarget} />
      </>
    );
  }
  return (
    <>
      <input type="hidden" name="event_type" value="kompetisi" />
      <input type="hidden" name="num_teams" value={w.kompetisi.numTeams ?? ""} />
      <input type="hidden" name="num_groups" value={w.kompetisi.numGroups ?? ""} />
      <input type="hidden" name="advance_per_group" value={w.kompetisi.advance ?? ""} />
      <input type="hidden" name="teams" value={JSON.stringify(w.teams.filled)} />
    </>
  );
}
