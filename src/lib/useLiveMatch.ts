"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Match } from "@/lib/database.types";

/**
 * Keeps a `matches` row in sync via Supabase Realtime.
 * - With `matchId`: follows that specific row (used by the overlay/admin).
 * - With `eventId`: follows whichever row of that event is `is_live` (OBS link of an event).
 * - Without either: follows whichever row is currently `is_live` (used by Home).
 */
export function useLiveMatch(initial: Match | null, matchId?: string, eventId?: string) {
  const [match, setMatch] = useState<Match | null>(initial);

  useEffect(() => {
    const supabase = createClient();

    const refetch = async () => {
      let q = supabase.from("matches").select("*");
      if (matchId) q = q.eq("id", matchId);
      else {
        if (eventId) q = q.eq("event_id", eventId);
        q = q.eq("is_live", true).order("updated_at", { ascending: false });
      }
      const { data, error } = await q.limit(1).maybeSingle();
      if (!error) setMatch(data ?? null); // on network error keep what we have
    };

    const channel = supabase
      .channel(`matches-${matchId ?? (eventId ? `event-${eventId}` : "live")}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          ...(matchId ? { filter: `id=eq.${matchId}` } : eventId ? { filter: `event_id=eq.${eventId}` } : {}),
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            refetch();
            return;
          }
          const row = payload.new as Match;
          if (matchId) {
            setMatch(row);
          } else if (row.is_live) {
            setMatch(row);
          } else {
            // The row we were following went off air — look for another live one.
            refetch();
          }
        },
      )
      .subscribe();

    refetch();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, eventId]);

  return match;
}

/**
 * Poll a `matches` row via plain REST instead of Supabase Realtime — for
 * public, high-traffic viewers where opening a WebSocket per visitor isn't
 * worth eating into the project's Realtime concurrent-connection budget.
 * Admin/OBS viewers stay on `useLiveMatch` (few clients, want instant sync).
 */
export function usePolledLiveMatch(initial: Match | null, intervalMs = 8000) {
  const [match, setMatch] = useState<Match | null>(initial);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const fetchLive = async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("is_live", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && !error) setMatch(data ?? null);
    };

    fetchLive();
    const id = setInterval(fetchLive, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return match;
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
