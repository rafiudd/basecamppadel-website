"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Match } from "@/lib/database.types";
import { useMatchControl, type MatchControl } from "./useMatchControl";
import { GameButtons, ServeButton, SetSteppers, StatusNotes } from "./ScoreInputs";
import { FinishMatchModal } from "./FinishMatchModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/** Live page: full score control of the current match. */
export function LiveControl({ initial, label }: { initial: Match; label: string }) {
  const router = useRouter();
  const ctl = useMatchControl(initial);
  const { m, finished } = ctl;
  const [finishing, setFinishing] = useState(false);
  const [resetting, setResetting] = useState(false);

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="text-xs font-bold tracking-caps text-snow/70 uppercase">{label}</div>
          <div className="font-display font-bold text-title">{m.team_a_name} vs {m.team_b_name}</div>
        </div>
        <OnAirToggle on={m.is_live} disabled={finished || ctl.pending} onClick={ctl.toggleOnAir} />
      </div>

      <StatusNotes error={ctl.error} finished={finished} games={[m.team_a_games, m.team_b_games]} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(["A", "B"] as const).map((side) => <TeamPanel key={side} side={side} ctl={ctl} />)}
      </div>

      <div className="bg-ink-3 rounded-2xl px-5 py-4 flex items-center gap-3 flex-wrap">
        <div className="flex flex-col">
          <span className="text-xs text-snow/70 tracking-caps">TIMER</span>
          <span className="font-display font-bold text-score text-volt leading-stat tabular-nums">{ctl.timerText}</span>
        </div>
        <button type="button" onClick={ctl.toggleTimer} className="btn min-h-10 px-4.5 tracking-button">{m.timer_running ? "Jeda" : "Mulai"}</button>
        <button type="button" onClick={ctl.resetTimer} className="btn bg-transparent text-snow/85 min-h-10 px-4.5 tracking-button">Reset timer</button>
        <div className="flex-1" />
        <span className="text-xs text-snow/50">{ctl.saving ? "menyimpan…" : "tersimpan"}</span>
        <button
          type="button"
          disabled={!ctl.canFinish}
          title={!finished && !ctl.canFinish ? "Skor masih seri" : undefined}
          onClick={() => setFinishing(true)}
          className="btn btn-volt min-h-10 px-4.5 tracking-button"
        >
          Selesaikan match
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={ctl.undo} disabled={!ctl.canUndo || finished} className="btn bg-transparent text-snow/85 min-h-10 px-4.5 tracking-button">
          Batalkan input terakhir
        </button>
        <button type="button" disabled={finished} onClick={() => setResetting(true)} className="btn btn-danger min-h-10 px-4.5 tracking-button">
          Reset skor match ini
        </button>
      </div>

      {resetting && (
        <ConfirmDialog
          danger
          confirmLabel="Ya, reset"
          message="Reset skor match ini ke 0? Bisa dibatalkan dengan Batalkan input terakhir."
          onConfirm={() => {
            setResetting(false);
            ctl.resetScore();
          }}
          onCancel={() => setResetting(false)}
        />
      )}
      {finishing && <FinishMatchModal m={m} onClose={() => setFinishing(false)} onDone={() => { setFinishing(false); router.replace(`/admin/live?event=${m.event_id}&done=${m.id}`, { scroll: false }); }} />}
    </div>
  );
}

function TeamPanel({ side, ctl }: { side: "A" | "B"; ctl: MatchControl }) {
  const { m, finished } = ctl;
  const name = side === "A" ? m.team_a_name : m.team_b_name;
  const serving = m.serve === side;
  return (
    <div className={`bg-indigo rounded-2xl p-5 flex flex-col gap-4 ${serving ? "ring-2 ring-inset ring-volt" : ""}`}>
      <div className="font-display font-bold text-xl">{name}</div>
      <SetSteppers sets={(side === "A" ? m.team_a_sets : m.team_b_sets) ?? [0, 0]} team={name} disabled={finished} onStep={(i, d) => ctl.setSet(side, i, d)} />
      <GameButtons value={side === "A" ? m.team_a_game : m.team_b_game} disabled={finished} onPick={(v) => ctl.setGame(side, v)} />
      <ServeButton serving={serving} disabled={finished} onClick={() => ctl.setServe(side)} />
    </div>
  );
}

/** ON AIR switch: pill with a dot and a toggle track. */
function OnAirToggle({ on, disabled, onClick }: { on: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={`rounded-full min-h-11 pl-4 pr-2 py-1.5 flex items-center justify-between gap-3 text-snow border ${on ? "border-coral/60 bg-coral/14" : "border-snow/20 bg-snow/6"}`}
    >
      <span className="flex items-center gap-2 font-bold text-sm">
        <span className={`w-2.5 h-2.5 rounded-full ${on ? "bg-coral" : "bg-snow/40"}`} />
        {on ? "ON AIR" : "OFF AIR"}
      </span>
      <span className={`w-12 h-7 rounded-full relative flex-none ${on ? "bg-coral" : "bg-snow/20"}`}>
        <span className={`absolute top-0.75 w-5.5 h-5.5 rounded-full bg-snow transition-all ${on ? "left-5.75" : "left-0.75"}`} />
      </span>
    </button>
  );
}
