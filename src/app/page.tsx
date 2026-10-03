import Image from "next/image";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { LiveCard } from "@/components/LiveCard";
import { getActivePlayers, getLiveMatch, rankByGender } from "@/lib/queries";
import { WHATSAPP_URL } from "@/lib/config";

export const revalidate = 0;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (name.slice(0, 2) || "BP").toUpperCase();
}

const WHY = [
  {
    n: "01",
    title: "Konsisten",
    body: "Jadwal rutin tiap minggu, jadi gampang tetap main tanpa mikir cari lawan.",
  },
  {
    n: "02",
    title: "Semua Level",
    body: "Dari upper beginner sampai yang udah jago, sesi dibagi biar match-nya seimbang.",
  },
  {
    n: "03",
    title: "Komunitas",
    body: "Kenal temen main baru, sparring bareng, dan naik level bareng-bareng.",
  },
];

export default async function HomePage() {
  const [live, players] = await Promise.all([
    getLiveMatch(),
    getActivePlayers(),
  ]);
  const { men } = rankByGender(players);
  const topMen = men.slice(0, 3);

  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative min-h-[640px] md:h-[760px] flex items-end overflow-hidden bg-ink px-6 md:px-12 pb-16 md:pb-[120px]">
        <Image
          src="/images/hero.jpg"
          alt="Basecamp Padel"
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(23,21,31,0.94) 12%, rgba(23,21,31,0.4) 60%, rgba(23,21,31,0.15) 100%)",
          }}
        />
        <div className="relative w-full max-w-[1440px] mx-auto">
          <div className="max-w-[800px] flex flex-col gap-5">
            <div className="font-sans font-bold text-sm tracking-[0.12em] text-coral uppercase">
              Basecamp Padel · Komunitas
            </div>
            <h1 className="font-display font-bold text-[44px] sm:text-[54px] md:text-[64px] leading-[1.05] text-snow m-0">
              Start. Settle in.
              <br />
              Level up.
            </h1>
            <p className="font-sans font-medium text-base md:text-lg text-snow/85 max-w-[520px] leading-[1.55] m-0">
              Komunitas mabar padel buat siapa aja — dari yang baru pegang raket sampai yang udah
              rutin naik level.
            </p>
            <div className="flex gap-4 items-center flex-wrap pt-2">
              <Link
                href="/jadwal"
                className="no-underline bg-coral text-ink rounded-full px-7 py-4 font-sans font-bold text-[15px] transition-transform hover:scale-105 active:scale-95"
              >
                Lihat Jadwal
              </Link>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener"
                className="no-underline text-snow font-sans font-bold text-[15px] py-4 px-2 underline underline-offset-4 hover:text-volt transition-colors"
              >
                Gabung via WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>


      {/* Live Sekarang */}
      <LiveCard initial={live} />

      {/* Main minggu ini & Top Leaderboard */}
      <section className="bg-snow px-6 md:px-12 py-10 md:py-14">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-5">
          <h2 className="font-display font-bold text-[28px] md:text-[30px] text-ink m-0">
            Main minggu ini
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left: Next Session Card */}
            <article className="bg-indigo border border-indigo rounded-2xl p-6 flex flex-col gap-4 text-snow h-full">
              <div className="flex gap-3.5 items-center">
                <div className="flex-none w-16 rounded-xl bg-snow/10 py-2 flex flex-col items-center gap-0.5">
                  <span className="text-[11px] font-bold tracking-[0.08em] text-volt">MIN</span>
                  <span className="font-display font-bold text-[26px] leading-none text-snow">1</span>
                  <span className="text-[11px] font-bold tracking-[0.08em] text-snow/70">NOV</span>
                </div>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-volt/16 text-volt">
                      Mabar
                    </span>
                  </div>
                  <Link href="/jadwal/mabar-minggu" className="no-underline text-snow">
                    <h3 className="font-display font-bold text-[19px] m-0 leading-tight hover:text-volt transition-colors">
                      Mabar Rutin Minggu
                    </h3>
                  </Link>
                </div>
              </div>

              <div className="text-sm text-snow/70">Americano · semua level</div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-snow/70 text-xs uppercase tracking-[0.06em]">Venue</div>
                  <div className="font-semibold mt-1 text-snow">East Padel House</div>
                </div>
                <div>
                  <div className="text-snow/70 text-xs uppercase tracking-[0.06em]">Jam</div>
                  <div className="font-semibold mt-1 text-snow">07:00–09:00</div>
                </div>
                <div>
                  <div className="text-snow/70 text-xs uppercase tracking-[0.06em]">Harga</div>
                  <div className="font-semibold mt-1 text-snow">Rp 50.000</div>
                </div>
                <div>
                  <div className="text-snow/70 text-xs uppercase tracking-[0.06em]">Peserta</div>
                  <div className="font-semibold mt-1 text-snow">6/8 pemain</div>
                </div>
              </div>

              <div className="mt-auto pt-2 flex flex-col gap-2">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener"
                  className="no-underline bg-coral text-ink font-bold text-sm py-3 px-5 rounded-full text-center transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Daftar via WhatsApp
                </a>
                <Link
                  href="/jadwal/mabar-minggu"
                  className="no-underline text-center text-sm font-bold text-volt py-1 hover:underline"
                >
                  Lihat detail →
                </Link>
              </div>
            </article>

            {/* Right: Top Leaderboard Preview */}
            <div className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-2 text-ink shadow-xs">
              <div className="flex items-center justify-between gap-3 pb-2">
                <div className="font-display font-bold text-xl">Top leaderboard · Men</div>
                <Link
                  href="/leaderboard"
                  className="text-sm font-bold text-indigo no-underline whitespace-nowrap hover:underline"
                >
                  Lihat semua →
                </Link>
              </div>

              {topMen.length > 0 ? (
                topMen.map((p, idx) => (
                  <Link
                    key={p.id}
                    href={`/leaderboard/${p.id}`}
                    className={`no-underline flex items-center gap-3.5 py-3 ${
                      idx === 0 ? "border-t-0" : "border-t border-ink/8"
                    } text-inherit hover:bg-ink/3 -mx-2 px-2 rounded-lg transition-colors`}
                  >
                    <div className="font-display font-bold text-[22px] w-6 text-indigo">{p.rank}</div>
                    <div className="w-10 h-10 rounded-full flex-none bg-indigo text-snow flex items-center justify-center font-display font-bold text-sm overflow-hidden">
                      {p.photo_url ? (
                        <Image
                          src={p.photo_url}
                          alt={p.name}
                          width={40}
                          height={40}
                          unoptimized
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(p.name)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-base text-ink truncate">{p.name}</div>
                      <div className="text-[13px] text-ink/65 truncate">
                        {p.level || "Beginner"}
                        {p.region ? ` · ${p.region}` : ""}
                      </div>
                    </div>
                    <div className="font-bold text-sm text-ink whitespace-nowrap">{p.points} poin</div>
                  </Link>
                ))
              ) : (
                <div className="text-sm text-ink/50 py-4">Belum ada data pemain.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Why join (3 columns with top border) */}
      <section className="bg-snow text-ink px-6 md:px-12 py-16 md:py-20">
        <div className="w-full max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          {WHY.map((w) => (
            <div key={w.n} className="border-t-2 border-ink pt-4">
              <div className="font-display font-bold text-[15px] text-ink/65">{w.n}</div>
              <div className="font-display font-bold text-[24px] mt-2">{w.title}</div>
              <p className="font-sans text-[16px] text-ink/75 mt-2 leading-[1.55]">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Community */}
      <section className="bg-indigo text-snow px-6 md:px-12 py-20 md:py-24">
        <div className="w-full max-w-[1440px] mx-auto grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          <div className="relative w-full h-[280px] md:h-[420px] rounded-[20px] overflow-hidden">
            <Image
              src="/images/community.webp"
              alt="Sesi mabar Basecamp Padel"
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 600px"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col gap-5 text-snow">
            <div className="font-sans font-bold text-sm tracking-[0.1em] text-volt uppercase">
              Kenapa Basecamp Padel
            </div>
            <h2 className="font-display font-bold text-[32px] md:text-[36px] leading-[1.2] m-0">
              Mulai dari basecamp,
              <br />
              naik level bareng.
            </h2>
            <p className="font-sans text-base text-snow/80 leading-[1.6] m-0">
              Basecamp Padel dimulai dari orang-orang yang cuma mau main bareng tiap minggu.
              Sekarang jadi tempat mabar rutin — dari sesi santai sampai battle antar pasangan.
            </p>
            <div className="font-display font-bold text-[20px] text-coral">
              Mulai. Betah. Naik level.
            </div>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-coral px-6 md:px-12 py-16 md:py-20 text-center">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col items-center gap-5">
          <h2 className="font-display font-bold text-[28px] md:text-[34px] text-ink m-0">
            Siap gabung sesi berikutnya?
          </h2>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener"
            className="no-underline bg-ink text-snow rounded-full px-8 py-4 font-sans font-bold text-[15px] transition-transform hover:scale-105 active:scale-95 shadow-md"
          >
            Daftar via WhatsApp
          </a>
        </div>
      </section>
    </PublicShell>
  );
}


