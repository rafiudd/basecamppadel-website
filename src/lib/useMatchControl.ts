"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLiveMatch, useTick } from "@/lib/useLiveMatch";
import { formatTimer, matchElapsedSeconds } from "@/lib/format";
import type { Match, Serve } from "@/lib/database.types";

type Side = "A" | "B";

/** Shared optimistic-update + realtime logic behind the score control UIs (full desktop and quick mobile). */
export function useMatchControl(initial: Match) {
  const remote = useLiveMatch(initial, initial.id);
  const [local, setLocal] = useState<Match>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());
  const debounce = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Realtime → local (other operators / other tabs). "Adjust state during render" pattern.
  const [prevRemote, setPrevRemote] = useState(remote);
  if (remote !== prevRemote) {
    setPrevRemote(remote);
    if (remote) setLocal(remote);
  }

  useTick(local.timer_running);

  const persist = useCallback(
    async (patch: Partial<Match>) => {
      setSaving(true);
      setError(null);
      const { error } = await supabaseRef.current.from("matches").update(patch).eq("id", local.id);
      if (error) setError(error.message);
      setSaving(false);
    },
    [local.id],
  );

  /** Apply optimistically, then write to Supabase. */
  const update = useCallback(
    (patch: Partial<Match>, debounceKey?: string) => {
      setLocal((m) => ({ ...m, ...patch }));
      if (debounceKey) {
        clearTimeout(debounce.current[debounceKey]);
        debounce.current[debounceKey] = setTimeout(() => persist(patch), 400);
      } else {
        persist(patch);
      }
    },
    [persist],
  );

  const m = local;
  const finished = m.status === "finished";

  const setSet = (side: Side, idx: 0 | 1, delta: number) => {
    const key = side === "A" ? "team_a_sets" : "team_b_sets";
    const sets = [...(m[key] ?? [0, 0])];
    sets[idx] = Math.max(0, (sets[idx] ?? 0) + delta);
    update({ [key]: sets } as Partial<Match>);
  };

  const setGame = (side: Side, val: string) =>
    update(side === "A" ? { team_a_game: val } : { team_b_game: val });

  const setServe = (side: Serve) => update({ serve: side });

  const toggleLive = () =>
    update({ is_live: !m.is_live, status: !m.is_live ? "live" : m.status === "finished" ? "finished" : "scheduled" });

  const toggleTimer = () => {
    if (m.timer_running) {
      update({
        timer_running: false,
        timer_base_seconds: matchElapsedSeconds(m),
        timer_start: null,
      });
    } else {
      update({ timer_running: true, timer_start: new Date().toISOString() });
    }
  };

  const resetTimer = () => update({ timer_running: false, timer_start: null, timer_base_seconds: 0 });

  const resetScore = () =>
    update({ team_a_sets: [0, 0], team_b_sets: [0, 0], team_a_game: "0", team_b_game: "0", serve: "A" });

  const timerText = formatTimer(matchElapsedSeconds(m));

  return {
    m,
    finished,
    saving,
    error,
    setError,
    update,
    setSet,
    setGame,
    setServe,
    toggleLive,
    toggleTimer,
    resetTimer,
    resetScore,
    timerText,
  };
}
