import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { ClaimView } from "@/components/account/ClaimView";
import { choosePlayer } from "@/app/akun/actions";
import { requireStep } from "@/lib/account";
import { safeNext } from "@/lib/accountRules";

export const metadata: Metadata = { title: "Sambungkan data pemain — Basecamp Padel", robots: { index: false } };

/** No WA match, but legacy players share the name: "Ini saya" files a claim an admin verifies. */
export default async function SambungkanPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const { supabase } = await requireStep("choose", next);
  const { data: candidates } = await supabase.rpc("account_name_candidates");

  return (
    <PublicShell>
      <ClaimView candidates={candidates ?? []} next={next} action={choosePlayer} />
    </PublicShell>
  );
}
