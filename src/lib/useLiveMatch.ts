"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { offAirFallback } from "@/lib/compData";
import type { Match } from "@/lib/database.types";

/**
 * Keeps a `matches` row in sync via Supabase Realtime.
 * - With `matchId`: follows that specific row (used by the overlay/admin).
 * - With `eventId` (+ `courtId`): follows an ON AIR row of that event (of that court) — OBS links.
 * - Without either: follows an ON AIR row (used by Home).
 * Several rows can be ON AIR, so a followed row is kept while it stays ON AIR (and in the court);
 * only when it goes off air does it switch to the latest other ON AIR row.
 *
 * When `eventId` is given and nothing is ON AIR, this re-derives the exact same off-air fallback
 * (next scheduled match, else the event's own name/venue/date) the overlay page computes for first
 * render — without it, the unconditional refetch on mount would immediately stomp that richer
 * server-rendered fallback back down to a bare `null` the moment the client takes over, since a
 * plain `is_live = true` query has no way to know about it.
 */
export function useLiveMatch(initial: Match | null, matchId?: string, eventId?: string, courtId?: string) {
  const [match, setMatch] = useState<Match | null>(initial);
  // Only tracks a row we're following because it's genuinely ON AIR — null while showing an
  // off-air fallback, so a real match going live is never mistaken for "already followed".
  const followedLive = useRef<string | null>(initial?.is_live ? initial.id : null);

  useEffect(() => {
    const supabase = createClient();
    const follow = (row: Match | null) => {
      followedLive.current = row?.is_live ? row.id : null;
      setMatch(row);
    };

    const refetch = async () => {
      let q = supabase.from("matches").select("*");
      if (matchId) q = q.eq("id", matchId);
      else {
        if (eventId) q = q.eq("event_id", eventId);
        if (courtId) q = q.eq("court_id", courtId);
        q = q.eq("is_live", true).order("updated_at", { ascending: false });
      }
      const { data, error } = await q.limit(1).maybeSingle();
      if (error) return; // network error: keep what we have
      if (data || matchId || !eventId) {
        follow(data ?? null);
        return;
      }
      follow(await offAirFallback(supabase, eventId, courtId));
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

        if (json.match) {
          follow(json.match);
        } else if (!matchId && eventId) {
          follow(await offAirFallback(supabase, eventId, courtId));
        } else if (!matchId) {
          follow(null);
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
 * Poll the ON AIR `matches` rows (latest first) via plain REST instead of Supabase Realtime — for
 * public, high-traffic viewers where opening a WebSocket per visitor isn't worth eating into the
 * project's Realtime concurrent-connection budget. Admin/OBS viewers stay on `useLiveMatch`.
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
