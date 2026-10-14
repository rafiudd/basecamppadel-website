import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { ClaimView } from "@/components/account/ClaimView";
import { DemoBanner } from "@/components/account/DemoBanner";
import { demoChoosePlayer } from "../actions";
import { ACCOUNT_DEMO } from "@/lib/config";
import { demoCandidates } from "@/lib/demoAccount";

export const metadata: Metadata = { title: "Demo sambungkan — Basecamp Padel", robots: { index: false } };

export default function DemoSambungkanPage() {
  if (!ACCOUNT_DEMO) notFound();
  return (
    <PublicShell>
      <DemoBanner current="/akun-demo/sambungkan" />
      <ClaimView candidates={demoCandidates} next="/akun-demo" action={demoChoosePlayer} />
    </PublicShell>
  );
}
