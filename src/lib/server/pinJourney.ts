import { cache } from "react";
import type { createClient } from "@/lib/supabase/server";
import { PIN_JOURNEY_LEVELS, PIN_MISSIONS, type PinMission, type PlayerLevelName } from "@/lib/pinJourney";

/** `pin_journey_config.id` for each level — a slug, not a random uuid (see that collection's doc). */
export const LEVEL_SLUG: Record<PlayerLevelName, string> = {
  Rookie: "rookie",
  Beginner: "beginner",
  "Low Bronze": "low_bronze",
  Bronze: "bronze",
  Silver: "silver",
};

/**
 * The missions actually in effect for every level: an admin's saved override from
 * `/admin/coaching/pin-journey` where one exists, else pinJourney.ts's hardcoded PIN_MISSIONS.
 */
export const getPinMissions = cache(async function getPinMissions(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Record<PlayerLevelName, PinMission[]>> {
  const { data } = await supabase.from("pin_journey_config").select("id, missions");
  const overrides = new Map((data ?? []).map((row) => [row.id, row.missions as PinMission[]]));
  const result = {} as Record<PlayerLevelName, PinMission[]>;
  for (const level of PIN_JOURNEY_LEVELS) {
    result[level] = overrides.get(LEVEL_SLUG[level]) ?? PIN_MISSIONS[level];
  }
  return result;
});
