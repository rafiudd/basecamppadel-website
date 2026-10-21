"use client";

import { useEffect, useRef, useState } from "react";
import type { Match } from "@/lib/database.types";

/**
 * Keeps a `matches` row in sync via HTTP polling against `/api/live/match`.
 * - With `matchId`: follows that specific row (used by the overlay/admin).
 * - With `eventId` (+ `courtId`): follows an ON AIR row of that event (of that court) — OBS links.
 * - Without either: follows an ON AIR row (used by Home).
 *
 * When `eventId` is given and nothing is ON AIR, `/api/live/match` computes the exact same
 * off-air fallback (next scheduled match, else the event's own name/venue/date) that the overlay
 * page renders on initial load.
 */
export function useLiveMatch(
  initial: Match | null,
  matchId?: string,
  eventId?: string,
  courtId?: string
) {
  const [match, setMatch] = useState<Match | null>(initial);
  const followedLive = useRef<string | null>(
    initial?.is_live ? initial.id : null
  );

  useEffect(() => {
    const follow = (row: Match | null) => {
      followedLive.current = row?.is_live ? row.id : null;
      setMatch(row);
    };

    let cancelled = false;
    const pollLive = async () => {
      try {
        const params = new URLSearchParams();
        if (matchId) params.set("matchId", matchId);
        if (eventId) params.set("eventId", eventId);
        if (courtId) params.set("courtId", courtId);

        const res = await fetch(`/api/live/match?${params.toString()}`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (cancelled) return;

        if (json.match !== undefined) {
          follow(json.match ?? null);
        }
      } catch {
        // network error: keep current state
      }
    };

    pollLive();
    const intervalId = setInterval(pollLive, 1500);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [matchId, eventId, courtId]);

  return match;
}

/** At most this many ON AIR matches are shown on Home. */
const MAX_POLLED = 6;

/**
 * Poll the ON AIR `matches` rows (latest first) via plain REST.
 */
export function usePolledLiveMatches(initial: Match[], intervalMs = 8000) {
  const [matches, setMatches] = useState<Match[]>(initial);

  useEffect(() => {
    let cancelled = false;

    const fetchLive = async () => {
      try {
        const res = await fetch(`/api/live/match?limit=${MAX_POLLED}`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled && Array.isArray(json.matches)) {
          setMatches(json.matches);
        }
      } catch {
        // network error: keep current state
      }
    };

    fetchLive();
    const id = setInterval(fetchLive, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return matches;
}

/** Re-renders every second while a timer is running so the clock ticks. */
export function useTick(active: boolean) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setN((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
}
