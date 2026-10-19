import { createClient } from "@/lib/supabase/server";

export async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, isAdmin: false, isCoach: false, role: null as "admin" | "coach" | null, coachId: null as string | null };
  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("role, coach_id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Access follows admin_users.role, the same row is_admin() / is_coach() read for RLS.
  // A signed-in player without an admin_users row is neither; an admin also gets coach access.
  const role = (adminRow?.role as "admin" | "coach" | undefined) ?? null;
  const isAdmin = role === "admin";
  const isCoach = role === "coach" || isAdmin;
  return { user, isAdmin, isCoach, role, coachId: adminRow?.coach_id ?? null };
}

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
