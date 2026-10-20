import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminCoaches } from "@/lib/server/kelas";
import { AdminClassForm } from "@/components/admin/kelas/AdminClassForm";

export const metadata = {
  title: "Admin · Edit Kelas — Basecamp Padel",
};

export default async function EditClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: classData, error } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !classData) {
    notFound();
  }

  const coaches = await getAdminCoaches();

  return <AdminClassForm classData={classData} coaches={coaches} />;
}
