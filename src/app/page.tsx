import Image from "next/image";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { LiveCard } from "@/components/LiveCard";
import { getLiveMatch } from "@/lib/queries";
import { WHATSAPP_URL } from "@/lib/config";

export const revalidate = 0;

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
  const live = await getLiveMatch();

  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative min-h-[640px] md:min-h-[960px] flex items-end overflow-hidden bg-ink">
        <Image
          src="/images/hero-placeholder.svg"
          alt=""
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
              "linear-gradient(to top, rgba(23,21,31,0.92) 10%, rgba(23,21,31,0.35) 60%, rgba(23,21,31,0.15) 100%)",
          }}
        />
        <div className="relative px-6 pb-14 md:px-12 md:pb-[72px] max-w-[800px] flex flex-col gap-5">
          <div className="font-sans font-bold text-sm tracking-[0.12em] text-coral uppercase">
            Basecamp Padel · Komunitas
          </div>
          <h1 className="font-display font-bold text-[44px] md:text-[64px] leading-[1.05] text-snow">
            Start. Settle in.
            <br />
            Level up.
          </h1>
          <p className="font-sans font-medium text-base md:text-lg text-snow/80 max-w-[520px]">
            Komunitas mabar padel buat siapa aja — dari yang baru pegang raket sampai yang udah
            rutin naik level.
          </p>
          <div className="flex gap-3.5 flex-wrap pt-2">
            <Link
              href="/jadwal"
              className="no-underline bg-coral text-snow rounded-full px-7 py-4 font-sans font-bold text-[15px]"
            >
              Lihat Jadwal
            </Link>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener"
              className="no-underline bg-transparent text-snow border border-snow/50 rounded-full px-7 py-4 font-sans font-bold text-[15px]"
            >
              Gabung via WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Live Sekarang — only renders when a match is live (realtime) */}
      <LiveCard initial={live} />

      {/* Why join */}
      <section className="px-6 md:px-12 py-16 md:py-24 max-w-[1200px] mx-auto grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-10">
        {WHY.map((w) => (
          <div key={w.n}>
            <div className="font-display font-bold text-[15px] text-ink/30">{w.n}</div>
            <div className="font-display font-bold text-[22px] mt-2">{w.title}</div>
            <p className="font-sans text-[15px] text-ink/65 mt-2 leading-[1.5]">{w.body}</p>
          </div>
        ))}
      </section>

      {/* Community */}
      <section className="bg-indigo px-6 md:px-12 py-16 md:py-24 grid md:grid-cols-2 gap-10 md:gap-14 items-center max-w-[1200px] mx-auto rounded-t-[24px]">
        <div className="relative w-full h-[280px] md:h-[420px] rounded-[20px] overflow-hidden">
          <Image
            src="/images/community-placeholder.svg"
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
          <h2 className="font-display font-bold text-[30px] md:text-[36px] leading-[1.2]">
            Mulai dari basecamp,
            <br />
            naik level bareng.
          </h2>
          <p className="font-sans text-base text-snow/75 leading-[1.6]">
            Basecamp Padel dimulai dari orang-orang yang cuma mau main bareng tiap minggu.
            Sekarang jadi tempat mabar rutin — dari sesi santai sampai battle antar pasangan.
          </p>
          <div className="font-display font-bold text-[20px] text-coral">Mulai. Betah. Naik level.</div>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-coral px-6 md:px-12 py-14 md:py-[72px] text-center flex flex-col items-center gap-5">
        <h2 className="font-display font-bold text-[28px] md:text-[34px] text-snow">
          Siap gabung sesi berikutnya?
        </h2>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener"
          className="no-underline bg-ink text-snow rounded-full px-8 py-4 font-sans font-bold text-[15px]"
        >
          Daftar via WhatsApp
        </a>
      </section>
    </PublicShell>
  );
}
