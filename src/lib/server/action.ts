import { unstable_rethrow } from "next/navigation";
import type { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/actionState";

/** Building blocks for every admin server action (not actions themselves). */

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

/** Database constraint names → messages an admin understands. */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  comp_team_players_event_id_player_id_key: "Pemain ini sudah ada di tim lain pada event ini.",
  matches_one_on_air_per_court: "Court ini baru saja di-ON AIR-kan operator lain. Muat ulang lalu coba lagi.",
};

export function friendly(message: string) {
  const hit = Object.keys(CONSTRAINT_MESSAGES).find((k) => message.includes(k));
  return hit ? CONSTRAINT_MESSAGES[hit] : message;
}

// ---------------------------------------------------------------- FormData readers

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export const int = (fd: FormData, k: string, def: number) => {
  const v = Number(str(fd, k));
  return Number.isFinite(v) && str(fd, k) !== "" ? Math.round(v) : def;
};

export const intOrNull = (fd: FormData, k: string) => {
  const v = str(fd, k);
  return v === "" ? null : Number(v);
};
