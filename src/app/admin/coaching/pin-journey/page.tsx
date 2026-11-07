import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PIN_JOURNEY_LEVELS } from "@/lib/pinJourney";
import { getPinMissions, LEVEL_SLUG } from "@/lib/server/pinJourney";
import { PinJourneyConfigClient } from "./PinJourneyConfigClient";

export const metadata = { title: "Admin · Journey Pin — Basecamp Padel" };
export const dynamic = "force-dynamic";

export default async function PinJourneyConfigPage() {
  await requireAdmin();
  const supabase = await createClient();
  const missionsByLevel = await getPinMissions(supabase);
  const { data: overrides } = await supabase.from("pin_journey_config").select("id");
  const overriddenIds = new Set((overrides ?? []).map((o) => o.id));
  const overriddenLevels = PIN_JOURNEY_LEVELS.filter((level) => overriddenIds.has(LEVEL_SLUG[level]));

  return <PinJourneyConfigClient missionsByLevel={missionsByLevel} overriddenLevels={overriddenLevels} />;
}
