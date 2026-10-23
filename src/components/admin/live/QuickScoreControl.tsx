"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import type { Match } from "@/lib/database.types";
import { useMatchControl, type MatchControl } from "./useMatchControl";
import { GameButtons, ServeButton, SetSteppers, StatusNotes } from "./ScoreInputs";
import { FinishMatchModal } from "./FinishMatchModal";
import { Spinner } from "@/components/ui/Spinner";

/** Skor Cepat: the phone-sized score control, with undo for mis-taps. A tap shows a spinner and the score moves once it saved. */
export function QuickScoreControl({ initial }: { initial: Match }) {
  const router = useRouter();
  const ctl = useMatchControl(initial, { confirmFirst: true });
  const { m, finished } = ctl;
  const [finishing, setFinishing] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <StatusNotes error={ctl.error} finished={finished} games={[m.team_a_games, m.team_b_games]} />
      {(["A", "B"] as const).map((side) => <TeamBlock key={side} side={side} ctl={ctl} />)}

      <button type="button" disabled={!ctl.canFinish || !!ctl.busy} onClick={() => setFinishing(true)} className="btn btn-volt min-h-13 tracking-button">
        Selesaikan Match
      </button>
      {!finished && !ctl.canFinish && <div className="text-caption text-snow/60 text-center -mt-2">Skor masih seri, belum bisa diselesaikan.</div>}
      <div className="flex items-center justify-between gap-3 text-caption text-snow/70 px-1">
        <span>{ctl.saving ? "Menyimpan…" : "Tersimpan otomatis"}</span>
        <button
          type="button"
          onClick={ctl.undo}
          disabled={!ctl.canUndo || finished || !!ctl.busy}
          aria-busy={ctl.busy === "undo"}
          className="border-none bg-transparent text-snow font-bold text-sm min-h-11 px-1 flex items-center gap-2 disabled:opacity-40"
        >
          {ctl.busy === "undo" && <Spinner className="text-snow" />}
          Batalkan poin terakhir
        </button>
      </div>

      {finishing && <FinishMatchModal m={m} onClose={() => setFinishing(false)} onDone={() => { setFinishing(false); router.replace(`/admin/live/quick?event=${m.event_id}&done=${m.id}`, { scroll: false }); }} />}
    </div>
  );
}

/** Which of this team's controls is saving, from the hook's busy key ("game:A:30", "set:A:0:1", "serve:A"). */
function busyOf(busy: string | null, side: "A" | "B") {
  const [kind, s, a, b] = busy?.split(":") ?? [];
  if (s !== side) return { game: null, set: null, serve: false };
  return {
    game: kind === "game" ? a : null,
    set: kind === "set" ? { idx: Number(a) as 0 | 1, delta: Number(b) } : null,
    serve: kind === "serve",
  };
}

function TeamBlock({ side, ctl }: { side: "A" | "B"; ctl: MatchControl }) {
  const { m, finished } = ctl;
  const name = side === "A" ? m.team_a_name : m.team_b_name;
  const serving = m.serve === side;
  // one save at a time: while anything saves, every score control waits
  const locked = finished || !!ctl.busy || ctl.pending;
  const busy = busyOf(ctl.busy, side);
  return (
    <div className={`bg-indigo rounded-2xl p-4 flex flex-col gap-3.5 ${serving ? "ring-2 ring-inset ring-volt" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="font-display font-bold text-title uppercase truncate">{name}</div>
        <div className={`font-display font-bold text-score tabular-nums ${serving ? "text-volt" : "text-snow"}`}>{side === "A" ? m.team_a_games : m.team_b_games}</div>
      </div>
      <GameButtons big value={side === "A" ? m.team_a_game : m.team_b_game} disabled={locked} loading={busy.game} onPick={(v) => ctl.setGame(side, v)} />
      <SetSteppers
        big
        sets={(side === "A" ? m.team_a_sets : m.team_b_sets) ?? [0, 0]}
        team={name}
        disabled={locked}
        loading={busy.set}
        onStep={(i, d) => ctl.setSet(side, i, d)}
      />
      <ServeButton big serving={serving} disabled={locked} loading={busy.serve} onClick={() => ctl.setServe(side)} />
    </div>
  );
}
