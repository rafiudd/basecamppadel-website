import type { Player } from "@/lib/database.types";

/** The slice of a player the event screens need. */
export type PlayerSummary = Pick<Player, "id" | "name" | "gender" | "level" | "region">;

/** Card surfaces used by the event screens. */
export const card = "bg-ink-2 rounded-card";
export const sectionTitle = "font-display font-bold text-xl";
