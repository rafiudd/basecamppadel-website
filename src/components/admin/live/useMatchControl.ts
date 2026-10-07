"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLiveMatch, useTick } from "@/lib/useLiveMatch";
import { formatTimer, matchElapsedSeconds } from "@/lib/format";
import { goLive, startMatch } from "@/app/admin/events/live-actions";
import { toast } from "@/components/ui/Toast";

/** How many score inputs "Batalkan input terakhir" can step back. */
const UNDO_STEPS = 30;
import type { Match, Serve } from "@/lib/database.types";

type Side = Serve;
type Snapshot = Pick<Match, "team_a_sets" | "team_b_sets" | "team_a_game" | "team_b_game" | "serve" | "team_a_games" | "team_b_games">;

const sum = (a: number[] | null) => (a ?? []).reduce((s, n) => s + (n ?? 0), 0);
const setsKey = (side: Side) => (side === "A" ? "team_a_sets" : "team_b_sets");
const gamesKey = (side: Side) => (side === "A" ? "team_a_games" : "team_b_games");

/**
 * Score control of one competition match (Live page + Skor Cepat): optimistic writes straight to
 * `matches`, kept in sync with other operators via Realtime. Set scores also keep the game totals
 * current (bracket and klasemen show the live score), every score change can be undone, and ON AIR
 * goes through goLive (one ON AIR match per court).
 */
export function useMatchControl(initial: Match) {
  const router = useRouter();
  const remote = useLiveMatch(initial, initial.id);
  const [m, setLocal] = useState<Match>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [pending, start] = useTransition();
  const supabase = useRef(createClient());

  // Realtime → local (other operators / other tabs). "Adjust state during render" pattern.
  const [prevRemote, setPrevRemote] = useState(remote);
  if (remote !== prevRemote) {
    setPrevRemote(remote);
    if (remote) setLocal(remote);
  }
  useTick(m.timer_running);

  /** Apply optimistically, then write to Supabase. */
  const update = useCallback(
    async (patch: Partial<Match>) => {
      setLocal((cur) => ({ ...cur, ...patch }));
      setSaving(true);
      setError(null);
      const { error } = await supabase.current.from("matches").update(patch).eq("id", m.id);
      if (error) {
        setError(error.message);
        toast.error(`Gagal menyimpan: ${error.message}`);
      }
      setSaving(false);
      return !error;
    },
    [m.id],
  );

  // ---- score (undoable)
  const scored = (patch: Partial<Match>) => {
    const { team_a_sets, team_b_sets, team_a_game, team_b_game, serve, team_a_games, team_b_games } = m;
    const snapshot = { team_a_sets, team_b_sets, team_a_game, team_b_game, serve, team_a_games, team_b_games };
    if (m.status !== "scheduled") {
      setHistory((h) => [...h.slice(-(UNDO_STEPS - 1)), snapshot]);
      update(patch);
      return;
    }
    // The first score of a match that wasn't started starts it (server checks no team plays twice).
    if (pending) return;
    const fd = new FormData();
    fd.set("match_id", m.id);
    start(async () => {
      if (!toast.result(await startMatch(null, fd), "Match dimulai")) return;
      setHistory((h) => [...h.slice(-(UNDO_STEPS - 1)), snapshot]);
      await update({ ...patch, status: "live" });
      router.refresh();
    });
  };
  /** ± a game; a won game also sends both point scores back to 0. */
  const setSet = (side: Side, idx: 0 | 1, delta: number) => {
    const sets = [...(m[setsKey(side)] ?? [0, 0])];
    sets[idx] = Math.max(0, (sets[idx] ?? 0) + delta);
    scored({ [setsKey(side)]: sets, [gamesKey(side)]: sum(sets), ...(delta > 0 ? { team_a_game: "0", team_b_game: "0" } : {}) });
  };
  const setGame = (side: Side, val: string) => scored(side === "A" ? { team_a_game: val } : { team_b_game: val });
  const setServe = (side: Side) => scored({ serve: side });
  const resetScore = () => scored({ team_a_sets: [0, 0], team_b_sets: [0, 0], team_a_game: "0", team_b_game: "0", team_a_games: 0, team_b_games: 0 });
  const undo = () => {
    const last = history.at(-1);
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    update(last);
  };

  // ---- timer
  const toggleTimer = () =>
    update(m.timer_running ? { timer_running: false, timer_base_seconds: matchElapsedSeconds(m), timer_start: null } : { timer_running: true, timer_start: new Date().toISOString() });
  const resetTimer = () => update({ timer_running: false, timer_start: null, timer_base_seconds: 0 });

  // ---- ON AIR
  const toggleOnAir = () => {
    if (m.is_live) {
      update({ is_live: false }).then((ok) => ok && toast.success("Match tidak lagi ON AIR"));
      return;
    }
    const fd = new FormData();
    fd.set("event_id", m.event_id ?? "");
    fd.set("match_id", m.id);
    start(async () => {
      const res = await goLive(null, fd);
      setError(res?.error ?? null);
      if (toast.result(res, "Match ON AIR")) router.refresh();
    });
  };

  const isMabar = !!m.gen_match_id;
  return {
    m,
    isMabar,
    /** Kompetisi needs a winner (no tie); a mabar court can end level. */
    canFinish: m.status !== "finished" && (isMabar || m.team_a_games !== m.team_b_games),
    finished: m.status === "finished",
    saving,
    pending,
    error,
    setSet,
    setGame,
    setServe,
    resetScore,
    undo,
    canUndo: history.length > 0,
    toggleTimer,
    resetTimer,
    timerText: formatTimer(matchElapsedSeconds(m)),
    toggleOnAir,
  };
}

export type MatchControl = ReturnType<typeof useMatchControl>;
