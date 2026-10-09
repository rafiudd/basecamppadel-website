import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { Avatar } from "@/components/ui/Avatar";
import { lightCard, primaryButton, secondaryButton } from "@/components/account/styles";
import { choosePlayer } from "@/app/akun/actions";
import { getAccount } from "@/lib/account";
import { safeNext } from "@/lib/accountRules";

export const metadata: Metadata = { title: "Sambungkan data pemain — Basecamp Padel", robots: { index: false } };

/** No WA match, but legacy players share the name: "Ini saya" files a claim an admin verifies. */
export default async function SambungkanPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const { supabase, user, step } = await getAccount();
  if (!user) redirect(`/masuk?next=${encodeURIComponent(next)}`);
  if (step === "profile") redirect(`/akun/lengkapi?next=${encodeURIComponent(next)}`);
  if (step === "ready") redirect(next);

  const { data: candidates } = await supabase.rpc("account_name_candidates");
  const list = candidates ?? [];

  return (
    <PublicShell>
      <div className="px-4 md:px-12 pt-8 pb-14 md:pt-12 md:pb-18">
        <div className="max-w-160 mx-auto flex flex-col gap-6 text-ink">
          <div>
            <h1 className="font-display font-bold text-[30px] md:text-[40px] leading-[1.05] m-0">Ini kamu?</h1>
            <p className="mt-2 mb-0 text-base text-ink/70 leading-copy">
              {list.length
                ? "Ada data pemain lama dengan nama yang sama. Kalau itu kamu, poin dan riwayatnya bakal nyambung ke akun ini setelah dicek admin."
                : "Profil kamu sudah tersimpan. Lanjut sebagai pemain baru."}
            </p>
          </div>

          {list.length > 0 && (
            <div className={`${lightCard} flex flex-col gap-3 p-4!`}>
              {list.map((p) => (
                <div key={p.id} className="flex items-center gap-3 flex-wrap rounded-xl bg-snow px-3.5 py-3">
                  <Avatar name={p.name} photoUrl={p.photo_url} size={44} />
                  <div className="flex-1 min-w-40">
                    <div className="font-bold text-input">{p.name}</div>
                    <div className="text-caption text-ink/60">
                      {p.gender === "F" ? "Women" : "Men"}
                      {p.region ? ` · ${p.region}` : ""} · {p.points} poin
                    </div>
                  </div>
                  <ActionForm action={choosePlayer} successText="Klaim terkirim, tunggu verifikasi admin">
                    <input type="hidden" name="player_id" value={p.id} />
                    <input type="hidden" name="next" value={next} />
                    <button type="submit" className={`${primaryButton} min-h-10`}>Ini saya</button>
                  </ActionForm>
                </div>
              ))}
            </div>
          )}

          <ActionForm action={choosePlayer} successText={false} className="flex justify-end">
            <input type="hidden" name="player_id" value="" />
            <input type="hidden" name="next" value={next} />
            <button type="submit" className={`${list.length ? secondaryButton : primaryButton} w-full md:w-auto`}>
              {list.length ? "Bukan saya, aku pemain baru" : "Lanjut"}
            </button>
          </ActionForm>
        </div>
      </div>
    </PublicShell>
  );
}
