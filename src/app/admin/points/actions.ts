"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

const POINT_KEYS = ["champion", "runner_up", "sf", "qf", "r16", "group"] as const;

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function int(fd: FormData, key: string, fallback: number) {
  const raw = str(fd, key);
  const value = Number(raw);
  return Number.isFinite(value) && raw !== "" ? Math.round(value) : fallback;
}

export async function savePointPreset(_: unknown, fd: FormData) {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const eventId = str(fd, "event_id");

    if (!eventId) {
      throw new Error("Event tidak dipilih.");
    }

    const points = Object.fromEntries(
      POINT_KEYS.map((key) => [key, Math.max(0, int(fd, `points_${key}`, 0))])
    ) as Record<(typeof POINT_KEYS)[number], number>;

    const { error } = await supabase.from("events").update({ points }).eq("id", eventId);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/points");
    revalidatePath(`/admin/events/${eventId}`);
    return null;
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
