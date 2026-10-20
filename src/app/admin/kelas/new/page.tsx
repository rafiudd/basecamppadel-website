import { getAdminCoaches } from "@/lib/server/kelas";
import { AdminClassForm } from "@/components/admin/kelas/AdminClassForm";

export const metadata = {
  title: "Admin · Buat Kelas — Basecamp Padel",
};

export default async function NewClassPage() {
  const coaches = await getAdminCoaches();

  return <AdminClassForm coaches={coaches} />;
}
