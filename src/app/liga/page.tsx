import { createClient } from "@/lib/supabase/server";
import { loadLeagues } from "@/lib/leagues";
import { PublicShell } from "@/components/PublicShell";
import { LigaCard } from "@/components/liga/LigaCard";

export const metadata = {
  title: "Liga & Seri Kompetisi — Basecamp Padel",
  description:
    "Kompetisi berseri dalam beberapa volume. Ikut tiap volume, kumpulkan poin, dan buktikan progres kamu di klasemen liga.",
};

export default async function PublicLigaPage() {
  const supabase = await createClient();
  const leagues = await loadLeagues(supabase, { publishedOnly: true });

  return (
    <PublicShell>
      {/* Hero Banner */}
      <section className="bg-indigo px-6 md:px-12 py-12 md:py-16 text-snow">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-2.5">
          <div className="font-bold text-xs md:text-sm tracking-widest text-volt uppercase">
            Liga
          </div>
          <h1 className="font-display font-bold text-3xl md:text-5xl m-0 leading-tight">
            Liga &amp; seri kompetisi
          </h1>
          <p className="text-sm md:text-base text-snow/75 m-0 leading-relaxed max-w-xl">
            Kompetisi berseri dalam beberapa volume. Ikut tiap volume, kumpulkan poin, dan buktikan progres kamu di klasemen liga.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-6 md:px-12 py-10 md:py-16 bg-snow text-ink">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-8 md:gap-12">
          {/* Active Leagues */}
          <div className="flex flex-col gap-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display font-bold text-2xl md:text-title m-0">Liga berjalan</h2>
              <span className="text-sm text-ink/65">
                {leagues.length} liga
              </span>
            </div>

            {leagues.length === 0 ? (
              <div className="bg-white border border-ink/8 rounded-2xl p-12 text-center flex flex-col items-center gap-3">
                <div className="font-display font-bold text-xl text-ink">Belum ada liga aktif</div>
                <p className="text-sm text-ink/70 max-w-md m-0">
                  Liga baru sedang disiapkan oleh tim Basecamp Padel. Pantau terus jadwal kami untuk informasi pendaftaran volume berikutnya!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {leagues.map((l) => (
                  <LigaCard key={l.id} league={l} />
                ))}
              </div>
            )}
          </div>

          {/* How It Works */}
          <div className="flex flex-col gap-6 pt-4">
            <h2 className="font-display font-bold text-2xl md:text-title m-0">Cara liga bekerja</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-indigo text-volt flex items-center justify-center font-display font-bold text-lg flex-none">
                  1
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-display font-bold text-lg m-0">Ikut tiap volume</h3>
                  <p className="m-0 text-sm leading-relaxed text-ink/70">
                    Daftar di Vol. 1, Vol. 2, dan Vol. 3. Boleh mulai dari volume mana aja sesuai ketersediaan jadwal kamu.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-indigo text-volt flex items-center justify-center font-display font-bold text-lg flex-none">
                  2
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-display font-bold text-lg m-0">Kumpulkan poin</h3>
                  <p className="m-0 text-sm leading-relaxed text-ink/70">
                    Poin dari hasil akhir tiap volume masuk ke klasemen liga. Ikut bertanding aja udah dapat poin partisipasi.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-indigo text-volt flex items-center justify-center font-display font-bold text-lg flex-none">
                  3
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-display font-bold text-lg m-0">Juara di Final</h3>
                  <p className="m-0 text-sm leading-relaxed text-ink/70">
                    Setelah volume terakhir (Final), akumulasi poin tertinggi dinobatkan sebagai juara utama seri liga.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
