import { Badge } from "@/components/ui/Badge";
import { awaitingTeams } from "@/lib/compLabels";
import type { Match } from "@/lib/database.types";

/** Bye / Selesai / ON AIR / LIVE / Menunggu / Siap. */
export function MatchStatus({ m }: { m: Match }) {
  if (m.is_bye) return <Badge tone="faint">Bye</Badge>;
  if (m.status === "finished") return <Badge tone="win">Selesai{m.is_wo ? " · WO" : ""}</Badge>;
  if (m.is_live) return <Badge tone="coral">● ON AIR</Badge>;
  if (m.status === "live") return <Badge tone="coral">● LIVE</Badge>;
  if (awaitingTeams(m)) return <Badge tone="faint">Menunggu</Badge>;
  return <Badge tone="win">Siap</Badge>;
}
