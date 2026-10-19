import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { accountHome } from "@/lib/accountRules";

export default async function AdminHome() {
  const { user, role } = await getAdminUser();
  if (!user || !role) redirect("/");
  redirect(accountHome(role));
}
