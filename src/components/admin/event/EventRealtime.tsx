"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Live scoring writes on every point; wait this long after the last change before refetching. */
const REFRESH_DEBOUNCE_MS = 1000;

/**
 * Keeps an admin event page current: when a match of this event changes (scores from Live / Skor
 * Cepat, ON AIR, results), the server data is refetched. Refreshes are debounced, since live
 * scoring writes on every point.
 */
export function EventRealtime({ eventId }: { eventId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS);
    };
    const channel = supabase
      .channel(`admin-event-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `event_id=eq.${eventId}` }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "events", filter: `id=eq.${eventId}` }, refresh)
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [eventId, router]);
  return null;
}
