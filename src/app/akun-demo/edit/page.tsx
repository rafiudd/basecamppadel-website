import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { DemoBanner } from "@/components/account/DemoBanner";
import { ProfileEditView } from "@/components/account/ProfileEditView";
import { demoDeleteAccount, demoSaveProfile } from "../actions";
import { ACCOUNT_DEMO } from "@/lib/config";
import { demoProfile } from "@/lib/demoAccount";

export const metadata: Metadata = { title: "Demo edit profil — Basecamp Padel", robots: { index: false } };

export default function DemoEditPage() {
  if (!ACCOUNT_DEMO) notFound();
  return (
    <PublicShell>
      <DemoBanner current="/akun-demo/edit" />
      <ProfileEditView
        profile={demoProfile}
        email={demoProfile.email}
        backHref="/akun-demo"
        categoryLocked // the sample player already has points
        saveAction={demoSaveProfile}
        deleteAction={demoDeleteAccount}
      />
    </PublicShell>
  );
}
