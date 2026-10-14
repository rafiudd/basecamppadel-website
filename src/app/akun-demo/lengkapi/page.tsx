import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { DemoBanner } from "@/components/account/DemoBanner";
import { ProfileSetupView } from "@/components/account/ProfileSetupView";
import { demoSaveProfile } from "../actions";
import { ACCOUNT_DEMO } from "@/lib/config";
import { demoProfile } from "@/lib/demoAccount";

export const metadata: Metadata = { title: "Demo lengkapi profil — Basecamp Padel", robots: { index: false } };

export default function DemoLengkapiPage() {
  if (!ACCOUNT_DEMO) notFound();
  return (
    <PublicShell>
      <DemoBanner current="/akun-demo/lengkapi" />
      <ProfileSetupView email={demoProfile.email} googleName={demoProfile.full_name} next="/akun-demo" action={demoSaveProfile} />
    </PublicShell>
  );
}
