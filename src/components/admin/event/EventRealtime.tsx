"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps an admin event page current: refreshes periodically while the admin is on the event page.
 */
export function EventRealtime({ eventId }: { eventId: string }) {
  const router = useRouter();

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        if (typeof document !== "undefined" && document.visibilityState === "visible") {
          router.refresh();
        }
      }, 15000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        startPolling();
      } else if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [eventId, router]);

  return null;
}
