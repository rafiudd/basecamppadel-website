import { getAdminClasses } from "@/lib/server/kelas";
import { AdminClassListClient } from "@/components/admin/kelas/AdminClassListClient";

export const metadata = {
  title: "Admin · Kelas — Basecamp Padel",
};

export default async function AdminClassesPage() {
  const { classes, stats } = await getAdminClasses();

  return <AdminClassListClient initialClasses={classes} stats={stats} />;
}
