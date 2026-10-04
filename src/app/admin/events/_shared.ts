import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { createClient } from "@/lib/supabase/server";
import { loadCompetition, type CompetitionData } from "@/lib/compData";
import type { ActionState } from "@/lib/actionState";

/** Helpers shared by the event server actions (not actions themselves). */

export type Supa = Awaited<ReturnType<typeof createClient>>;

/** Expected errors are returned (Next hides thrown messages in production); redirects pass through. */
export async function guard(fn: () => Promise<void>): Promise<ActionState> {
  try {
    await fn();
    return null;
  } catch (e) {
    unstable_rethrow(e);
    return { error: e instanceof Error ? friendly(e.message) : String(e) };
  }
}

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const int = (fd: FormData, k: string, def: number) => {
  const v = Number(str(fd, k));
  return Number.isFinite(v) && str(fd, k) !== "" ? Math.round(v) : def;
};

export function revalidateEvent(id: string) {
  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/admin/events");
  revalidatePath("/admin/live");
  revalidatePath("/jadwal");
  revalidatePath("/jadwal/[slug]", "page");
}

export async function load(supabase: Supa, id: string): Promise<CompetitionData> {
  const data = await loadCompetition(supabase, { id });
  if (!data) throw new Error("Event tidak ditemukan");
  return data;
}

export function assertEditableRoster(data: CompetitionData) {
  if (data.matches.length) throw new Error("Jadwal sudah dibuat. Hapus jadwal dulu untuk mengubah tim atau grup.");
}

export function friendly(message: string) {
  if (message.includes("comp_team_players_event_id_player_id_key")) return "Pemain ini sudah ada di tim lain pada event ini.";
  return message;
}
