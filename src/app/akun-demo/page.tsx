import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/account/DemoBanner";
import { ProfileView, parseTab } from "@/components/account/profile/ProfileView";
import { demoSignOut } from "./actions";
import { ACCOUNT_DEMO } from "@/lib/config";
import { COACHING_SKILLS } from "@/lib/coachingSkills";
import { LEVEL_DEFINITIONS } from "@/lib/coaching";
import { demoCandidates, demoHistory, demoProfile, demoRecord, demoReports } from "@/lib/demoAccount";

export const metadata: Metadata = { title: "Demo profil — Basecamp Padel", robots: { index: false } };

/** /akun with sample data and no login (development, or NEXT_PUBLIC_ACCOUNT_DEMO=1). */
export default async function AkunDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; coach?: string; year?: string; klaim?: string; kosong?: string }>;
}) {
  if (!ACCOUNT_DEMO) notFound();
  const params = await searchParams;
  const pending = !!params.klaim; // after "Ini saya" in the demo: waiting for the admin, no data yet
  const empty = pending || !!params.kosong;

  return (
    <ProfileView
      profile={{ ...demoProfile, player_id: pending ? null : demoProfile.player_id, claim_player_id: pending ? demoCandidates[0].id : null }}
      tab={parseTab(params.tab)}
      coach={params.coach}
      year={params.year}
      claimedName={demoCandidates[0].name}
      skills={COACHING_SKILLS}
      reports={empty ? [] : demoReports}
      level={empty ? null : { name: "Low Bronze", color: LEVEL_DEFINITIONS["Low Bronze"].color }}
      history={empty ? { history: [], awards: [], events: [] } : demoHistory}
      points={empty ? 0 : demoRecord.points}
      playerName="Nadia"
      wins={empty ? 0 : demoRecord.wins}
      losses={empty ? 0 : demoRecord.losses}
      basePath="/akun-demo"
      banner={
        <DemoBanner current="/akun-demo">
          Lihat keadaan{" "}
          <Link href={empty && !pending ? "/akun-demo" : "/akun-demo?kosong=1"} className="font-bold text-ink">
            {empty && !pending ? "dengan data" : "belum ada data"}
          </Link>{" "}
          atau{" "}
          <Link href={pending ? "/akun-demo" : "/akun-demo?klaim=1"} className="font-bold text-ink">
            {pending ? "sudah tersambung" : "menunggu verifikasi admin"}
          </Link>
        </DemoBanner>
      }
      signOutAction={demoSignOut}
    />
  );
}
