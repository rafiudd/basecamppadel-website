import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";

export default async function AdminHome() {
  const { user, isAdmin, isCoach } = await getAdminUser();
  if (!user || (!isAdmin && !isCoach)) redirect("/");
  if (!isAdmin && isCoach) redirect("/admin/coaching");
  redirect("/admin/events");
}
