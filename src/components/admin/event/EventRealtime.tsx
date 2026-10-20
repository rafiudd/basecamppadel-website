"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps an admin event page current: refreshes periodically while the admin is on the event page.
 */
export function EventRealtime({ eventId }: { eventId: string }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, 5000);
    return () => clearInterval(id);
  }, [eventId, router]);
  return null;
}
