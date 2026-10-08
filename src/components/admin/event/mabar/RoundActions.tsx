import { ActionForm } from "@/components/admin/ActionForm";
import { finishMabar, nextMabarRound, regenerateMabarSchedule, startMabar } from "@/app/admin/events/mabar-actions";
import type { CompEvent, GenParticipant } from "@/lib/database.types";
import { isAmericanoFormat, isFixedFormat } from "@/lib/events";
import { americanoCoverage } from "@/lib/mabarRules";
import type { mabarProgress } from "@/lib/mabar";

type Progress = ReturnType<typeof mabarProgress>;

/** Bar under the courts: start, re-roll (Americano, before it starts), next round (Mexicano), finish. */
export function RoundActions({ event, progress, checkedIn }: { event: CompEvent; progress: Progress; checkedIn: GenParticipant[] }) {
  const { last, lastDone, allPlanned, allDone, started } = progress;
  const americano = isAmericanoFormat(event.mabar_format);
  const form = (action: Parameters<typeof ActionForm>[0]["action"], label: string, opts: { primary?: boolean; disabled?: boolean; confirm?: string; done?: string } = {}) => (
    <ActionForm action={action} successText={opts.done} confirmText={opts.confirm} confirmLabel={opts.confirm ? `Ya, ${label.toLowerCase()}` : undefined}>
      <input type="hidden" name="event_id" value={event.id} />
      <button type="submit" disabled={opts.disabled} className={`btn min-h-10 whitespace-nowrap disabled:bg-snow/6 disabled:text-snow/45 disabled:opacity-100 ${opts.primary ? "btn-volt" : ""}`}>
        {label}
      </button>
    </ActionForm>
  );
  const finish = (primary: boolean) =>
    form(finishMabar, primary ? "Selesaikan event" : "Selesaikan", {
      primary,
      done: "Mabar selesai, poin dibagikan",
      confirm: "Selesaikan mabar? Klasemen dikunci, juara dicatat, dan poin leaderboard dibagikan. Ronde yang belum dimulai dibuang.",
    });

  let message: string;
  let actions: React.ReactNode = null;
  let hint: React.ReactNode = null;
  if (event.status === "finished") {
    message = "Event selesai. Juara dicatat dan poin leaderboard sudah dibagikan.";
  } else if (!last) {
    message = `${checkedIn.length} peserta sudah check-in. ${americano ? "Jadwal semua ronde dibuat sekaligus." : "Ronde 1 diacak, ronde berikutnya dari klasemen."}`;
    actions = form(startMabar, americano ? "Buat jadwal" : "Buat ronde 1", { primary: true, done: americano ? "Jadwal dibuat" : "Ronde 1 dibuat" });
    if (americano) hint = <AmericanoHint event={event} checkedIn={checkedIn} />;
  } else if (allDone) {
    message = `Semua ${event.rounds} ronde selesai. Selesaikan event untuk mencatat juara dan membagikan poin.`;
    actions = finish(true);
  } else if (americano) {
    message = started ? "Jadwal terkunci. Isi skor tiap court sampai ronde terakhir." : "Jadwal sudah dibuat. Masih bisa diacak ulang sebelum ronde 1 dimulai.";
    actions = (
      <div className="flex items-center gap-2 flex-wrap">
        {!started && form(regenerateMabarSchedule, "Acak ulang jadwal", { done: "Jadwal diacak ulang", confirm: "Buat ulang seluruh jadwal dari peserta yang sudah check-in?" })}
        {started && finish(false)}
      </div>
    );
  } else {
    message = lastDone ? `Ronde ${last.round_no} selesai.` : `Selesaikan semua court dulu, lalu ronde ${last.round_no + 1} bisa dibuat.`;
    actions = (
      <div className="flex items-center gap-2 flex-wrap">
        {lastDone && finish(false)}
        {!allPlanned && form(nextMabarRound, `Buat ronde ${last.round_no + 1}`, { primary: true, disabled: !lastDone, done: `Ronde ${last.round_no + 1} dibuat` })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 bg-ink-3 rounded-card px-4.5 py-3.5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-caption text-snow/75">{message}</div>
        {actions}
      </div>
      {hint}
    </div>
  );
}

/**
 * Before an Americano schedule is made: how many rounds the auto-generated full cycle will take with
 * the people who checked in, and a warning when the courts can't fit every partnership/team matchup.
 * The round count is no longer something the admin configures — `startMabar` computes and stores the
 * same number this previews, so there's nothing here to compare it against.
 */
function AmericanoHint({ event, checkedIn }: { event: CompEvent; checkedIn: GenParticipant[] }) {
  const fixed = isFixedFormat(event.mabar_format);
  const units = fixed
    ? [...new Set(checkedIn.map((p) => p.team_no))].filter((n) => n != null && checkedIn.filter((p) => p.team_no === n).length >= 2).length
    : checkedIn.length;
  if (units < (fixed ? 2 : 4)) return null;
  const courts = event.court_ids.length || 1;
  const { cycle, total } = americanoCoverage(units, courts, fixed);
  const what = fixed ? "pertemuan antar tim" : "pasangan partner";
  const note = `${units} ${fixed ? "pasangan" : "pemain"}: jadwal otomatis ${cycle} ronde (${total} ${what}, semua ketemu tepat sekali). Dengan ${courts} court, tiap ronde cuma sebagian yang main — sisanya istirahat gantian.`;
  return <div className="text-xs leading-relaxed text-snow/60">{note}</div>;
}
