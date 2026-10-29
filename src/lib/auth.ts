import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { staffRole, type StaffRole } from "@/lib/accountRules";

export const getAdminUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, isAdmin: false, isCoach: false, isScoreKeeper: false, role: null as StaffRole | null, coachId: null as string | null };
  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("role, coach_id, active")
    .eq("user_id", user.id)
    .maybeSingle();

  // Access follows admin_users.role, the same row is_admin() / is_coach() read for RLS.
  // A signed-in player without an admin_users row (or a deactivated one) is none of these;
  // an admin also gets coach & scorekeeper access.
  const role = staffRole(adminRow);
  const isAdmin = role === "admin";
  const isCoach = role === "coach" || isAdmin;
  const isScoreKeeper = role === "scorekeeper" || isAdmin;
  return { user, isAdmin, isCoach, isScoreKeeper, role, coachId: adminRow?.coach_id ?? null };
});

export async function requireAdmin() {
  const { user, isAdmin } = await getAdminUser();
  if (!user || !isAdmin) throw new Error("Tidak punya akses admin.");
  return user;
}

export async function requireAdminOrCoach() {
  const ctx = await getAdminUser();
  if (!ctx.user || (!ctx.isAdmin && !ctx.isCoach)) throw new Error("Tidak punya akses.");
  return ctx;
}

/** Live scoring (Live page, Skor Cepat, freeform matches): admin or score keeper. */
export async function requireScoreKeeperOrAdmin() {
  const ctx = await getAdminUser();
  if (!ctx.user || (!ctx.isAdmin && !ctx.isScoreKeeper)) throw new Error("Tidak punya akses score keeper.");
  return ctx;
}
