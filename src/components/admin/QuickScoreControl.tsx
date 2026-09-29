"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMatchControl } from "@/lib/useMatchControl";
import { POINT_OPTIONS } from "@/lib/config";
import type { Match } from "@/lib/database.types";

type Side = "A" | "B";
type MatchSummary = Pick<Match, "id" | "team_a_name" | "team_b_name" | "is_live" | "status">;

function TeamBlock({
  side,
  name,
  sets,
  game,
  serving,
  finished,
  onSet,
  onGame,
  onServe,
}: {
  side: Side;
  name: string;
  sets: number[];
  game: string;
  serving: boolean;
  finished: boolean;
  onSet: (idx: 0 | 1, delta: number) => void;
  onGame: (val: string) => void;
  onServe: () => void;
}) {
  return (
    <div
      className="bg-indigo rounded-2xl p-4 flex flex-col gap-3.5"
      style={{ boxShadow: serving ? "inset 0 0 0 2px #FFD43B" : undefined }}
    >
      <div className="font-display font-bold text-[22px] uppercase truncate">{name}</div>

      <div className="flex gap-3">
        {([0, 1] as const).map((i) => (
          <div key={i} className="flex-1">
            <div className="label">Set {i + 1}</div>
            <div className="flex items-center gap-2">
              <button
                className="btn w-12 h-12 p-0 rounded-xl text-2xl bg-snow/15"
                disabled={finished}
                onClick={() => onSet(i, -1)}
                aria-label="kurang"
              >
                –
              </button>
              <div className="flex-1 text-center font-display font-bold text-[28px] tabular-nums">{sets[i] ?? 0}</div>
              <button
                className="btn w-12 h-12 p-0 rounded-xl text-2xl bg-snow/15"
                disabled={finished}
                onClick={() => onSet(i, 1)}
                aria-label="tambah"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="label">Skor game</div>
        <div className="grid grid-cols-5 gap-1.5">
          {POINT_OPTIONS.map((opt) => (
            <button
              key={opt}
              disabled={finished}
              onClick={() => onGame(opt)}
              className="py-3.5 rounded-xl font-bold text-base border-none"
              style={{
                background: game === opt ? "#FFD43B" : "rgba(251,247,241,0.12)",
                color: game === opt ? "#1B1650" : "#FBF7F1",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <button
        disabled={finished}
        onClick={onServe}
        className="btn py-3.5 text-base"
        style={{ background: serving ? "#FFD43B" : "rgba(251,247,241,0.12)", color: serving ? "#1B1650" : "#FBF7F1" }}
      >
        {serving ? "🎾 Sedang Serve" : "Jadikan Server"}
      </button>
    </div>
  );
}

export function QuickScoreControl({ initial, matches }: { initial: Match; matches: MatchSummary[] }) {
  const router = useRouter();
  const { m, finished, saving, error, setSet, setGame, setServe, toggleLive, toggleTimer, resetTimer, timerText } =
    useMatchControl(initial);

  return (
    <div className="flex flex-col gap-4">
      {matches.length > 1 && (
        <select
          className="field text-sm"
          value={m.id}
          onChange={(e) => router.push(`/admin/live/quick?match=${e.target.value}`)}
        >
          {matches.map((mm) => (
            <option key={mm.id} value={mm.id}>
              {mm.is_live ? "● " : ""}
              {mm.team_a_name} vs {mm.team_b_name} ({mm.status})
            </option>
          ))}
        </select>
      )}

      <button
        onClick={toggleLive}
        disabled={finished}
        className="btn rounded-full py-4 text-base font-bold"
        style={{ background: m.is_live ? "#FF5A3C" : "rgba(251,247,241,0.12)" }}
      >
        {m.is_live ? "● LIVE — tap untuk OFF AIR" : "OFF AIR — tap untuk LIVE"}
      </button>

      {error && <div className="text-sm text-loss bg-loss/15 rounded-lg px-3 py-2">{error}</div>}
      {finished && (
        <div className="text-sm bg-win/15 text-win rounded-lg px-3 py-2">
          Match sudah difinalisasi (pemenang: Tim {m.winner}). Skor terkunci.
        </div>
      )}

      <TeamBlock
        side="A"
        name={m.team_a_name}
        sets={m.team_a_sets}
        game={m.team_a_game}
        serving={m.serve === "A"}
        finished={finished}
        onSet={(idx, delta) => setSet("A", idx, delta)}
        onGame={(val) => setGame("A", val)}
        onServe={() => setServe("A")}
      />
      <TeamBlock
        side="B"
        name={m.team_b_name}
        sets={m.team_b_sets}
        game={m.team_b_game}
        serving={m.serve === "B"}
        finished={finished}
        onSet={(idx, delta) => setSet("B", idx, delta)}
        onGame={(val) => setGame("B", val)}
        onServe={() => setServe("B")}
      />

      <div className="bg-ink-3 rounded-2xl p-4 flex items-center gap-3 flex-wrap">
        <div className="font-display font-bold text-[24px] text-volt min-w-[100px] tabular-nums">{timerText}</div>
        <button className="btn btn-coral flex-1" onClick={toggleTimer}>{m.timer_running ? "PAUSE" : "START"}</button>
        <button className="btn" onClick={resetTimer}>RESET</button>
      </div>

      <div className="flex items-center justify-between text-xs text-snow/40 px-1">
        <span>{saving ? "menyimpan…" : "tersimpan"}</span>
        <Link href={`/admin/live?match=${m.id}`} className="text-snow/60 no-underline hover:text-volt">
          Kontrol lengkap →
        </Link>
      </div>
    </div>
  );
}
