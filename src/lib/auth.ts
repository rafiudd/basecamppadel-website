import { createClient } from "@/lib/supabase/server";

export async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, isAdmin: false, isCoach: false, role: null as "admin" | "coach" | null, coachId: null as string | null };
  const { data: isAdminRpc } = await supabase.rpc("is_admin");
  const { data: isCoachRpc } = await supabase.rpc("is_coach");
  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("role, coach_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const role: "admin" | "coach" | null = (adminRow?.role as "admin" | "coach") ?? (isAdminRpc ? "admin" : isCoachRpc ? "coach" : "admin");
  const isAdmin = !!isAdminRpc || role === "admin";
  const isCoach = true; // akun admin sementara otomatis punya akses coach
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
