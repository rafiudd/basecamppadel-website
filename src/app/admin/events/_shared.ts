import { revalidatePath } from "next/cache";
import { loadCompetition, type CompetitionData } from "@/lib/compData";
import type { Supa } from "@/lib/server/action";

/** Helpers shared by the event server actions (not actions themselves). Generic ones: @/lib/server/action. */

export { friendly, guard, int, str, type Supa } from "@/lib/server/action";

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
