"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { guardResult } from "@/lib/server/action";
import { requireAdmin } from "@/lib/auth";
import type { PinMission, PlayerLevelName } from "@/lib/pinJourney";
import { LEVEL_SLUG } from "@/lib/server/pinJourney";

/** Saves an admin's edited mission list for one level, overriding pinJourney.ts's hardcoded default. */
export async function savePinMissionsAction(level: PlayerLevelName, missions: PinMission[]) {
  return guardResult(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("pin_journey_config").upsert({
      id: LEVEL_SLUG[level],
      level,
      missions,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/coaching/pin-journey");
    revalidatePath("/akun");
    return { success: true };
  });
}

/** Drops a level's override, falling back to pinJourney.ts's hardcoded default again. */
export async function resetPinMissionsAction(level: PlayerLevelName) {
  return guardResult(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("pin_journey_config").delete().eq("id", LEVEL_SLUG[level]);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/coaching/pin-journey");
    revalidatePath("/akun");
    return { success: true };
  });
}
