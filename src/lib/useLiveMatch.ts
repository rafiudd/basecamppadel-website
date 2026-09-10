"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Match } from "@/lib/database.types";

/**
 * Keeps a `matches` row in sync via Supabase Realtime.
 * - With `matchId`: follows that specific row (used by the overlay/admin).
 * - Without: follows whichever row is currently `is_live` (used by Home).
 */
export function useLiveMatch(initial: Match | null, matchId?: string) {
  const [match, setMatch] = useState<Match | null>(initial);

  useEffect(() => {
    const supabase = createClient();

    const refetch = async () => {
      let q = supabase.from("matches").select("*");
      q = matchId
        ? q.eq("id", matchId)
        : q.eq("is_live", true).order("updated_at", { ascending: false });
      const { data, error } = await q.limit(1).maybeSingle();
      if (!error) setMatch(data ?? null); // on network error keep what we have
    };

    const channel = supabase
      .channel(`matches-${matchId ?? "live"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          ...(matchId ? { filter: `id=eq.${matchId}` } : {}),
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
  }, [matchId]);

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
