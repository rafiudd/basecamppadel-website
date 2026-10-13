import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { GoogleButton } from "@/components/account/GoogleButton";
import { getAccount } from "@/lib/account";
import { safeNext, stepPath } from "@/lib/accountRules";
import { ACCOUNT_DEMO } from "@/lib/config";

export const metadata: Metadata = { title: "Masuk — Basecamp Padel", robots: { index: false } };

const PERKS = [
  { title: "Lihat catatan coach", text: "Nilai teknik & evaluasi dari tiap sesi coaching" },
  { title: "Pantau progres", text: "Poin dan riwayat match kamu di satu tempat" },
  { title: "Daftar event lebih cepat", text: "Data kamu udah tersimpan, tinggal klik daftar" },
];

export default async function MasukPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next: rawNext, error } = await searchParams;
  const next = safeNext(rawNext);
  const { user, step } = await getAccount();
  if (user) redirect(stepPath(step, next));

  return (
    <PublicShell>
      <div className="grid grid-cols-1 md:grid-cols-2 bg-indigo text-snow md:min-h-[calc(100dvh-88px)]">
        <section className="relative overflow-hidden px-6 py-10 md:px-16 md:py-18 flex flex-col justify-center gap-6 md:gap-7">
          <div aria-hidden className="absolute -right-30 -bottom-40 w-105 h-105 rounded-full bg-coral opacity-90 hidden md:block" />
          <div className="relative text-caption tracking-[0.16em] font-bold text-volt">AKUN PEMAIN</div>
          <h1 className="relative font-display font-bold text-[36px] md:text-[56px] leading-none tracking-[-1px] m-0">
            Semua progres
            <br />
            padel kamu,
            <br />
            <span className="text-coral">di satu tempat.</span>
          </h1>
          <ul className="relative flex flex-col gap-4 max-w-115 list-none p-0 m-0">
            {PERKS.map((p) => (
              <li key={p.title} className="flex gap-3 items-start">
                <span aria-hidden className="mt-0.5 w-6 h-6 rounded-full bg-volt text-indigo flex items-center justify-center flex-none text-xs font-bold">✓</span>
                <div>
                  <div className="font-bold text-base">{p.title}</div>
                  <div className="text-sm text-snow/72 mt-0.5 leading-copy">{p.text}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex items-center justify-center px-4 py-8 md:p-12 bg-snow">
          <div className="w-full max-w-110 bg-white text-ink rounded-[20px] p-6 md:p-10 flex flex-col gap-5 box-border">
            <div className="flex flex-col gap-2">
              <h2 className="font-display font-bold text-[30px] leading-[1.1] m-0">Masuk ke Basecamp</h2>
              <p className="m-0 text-input leading-relaxed text-ink/70">Cukup pakai akun Google. Gak perlu bikin password baru.</p>
            </div>
            {error && (
              <div role="alert" className="text-sm font-semibold text-loss bg-loss/10 rounded-tile px-3.5 py-2.5">
                {error}
              </div>
            )}
            <GoogleButton next={next} />
            {ACCOUNT_DEMO && (
              <Link
                href="/akun-demo/lengkapi"
                className="flex items-center justify-center w-full min-h-12 rounded-xl border border-dashed border-indigo/40 bg-indigo/5 text-indigo font-semibold text-input no-underline hover:bg-indigo/10"
              >
                Lihat demo akun (tanpa login)
              </Link>
            )}
            <div className="flex items-center gap-3 text-caption text-ink/55">
              <span className="flex-1 h-px bg-ink/12" />
              Pertama kali?
              <span className="flex-1 h-px bg-ink/12" />
            </div>
            <p className="m-0 text-sm leading-relaxed text-ink/70">
              Login pertama otomatis bikin akun. Setelah itu kamu cukup isi profil singkat (1 menit).
            </p>
            <p className="m-0 text-xs leading-relaxed text-ink/55">
              Dengan masuk, kamu setuju dengan{" "}
              <Link href="/syarat" className="text-indigo font-semibold">
                Syarat
              </Link>{" "}
              &amp;{" "}
              <Link href="/privasi" className="text-indigo font-semibold">
                Kebijakan Privasi
              </Link>{" "}
              Basecamp Padel.
            </p>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
