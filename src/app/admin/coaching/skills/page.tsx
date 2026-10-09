import { getAdminUser, requireAdmin } from "@/lib/auth";
import { getCoachingSkills } from "@/lib/coaching-db";
import { MasterSkillsClient } from "./MasterSkillsClient";

export const metadata = {
  title: "Admin · Master Teknik Coaching — Basecamp Padel",
};
export const dynamic = "force-dynamic";

export default async function MasterSkillsPage() {
  await requireAdmin();
  const { isAdmin } = await getAdminUser();
  const skills = await getCoachingSkills();

  return <MasterSkillsClient initialSkills={skills} isAdmin={isAdmin} />;
}
