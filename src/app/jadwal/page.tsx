import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { getEvents } from "@/lib/events";
import { JadwalClient } from "@/components/jadwal/JadwalClient";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Jadwal Mabar & Kompetisi — Basecamp Padel",
  description: "Pilih event mabar atau kompetisi padel di Basecamp Padel. Cek detail jadwal, venue, format, dan daftar langsung via WhatsApp.",
};

export default async function JadwalPage() {
  const events = await getEvents();

  return (
    <PublicShell>
      {/* Header section with consistent padding and max-w-[1440px] */}
      <section className="bg-indigo px-6 md:px-12 py-12 md:py-14 text-snow">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-2.5">
          <div className="font-sans font-bold text-sm tracking-[0.1em] text-[#FFD43B] uppercase">
            Jadwal
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-[38px] leading-[1.15] m-0 text-snow">
            Mabar &amp; Kompetisi
          </h1>
          <p className="font-sans text-base text-snow/75 leading-relaxed m-0 max-w-[560px]">
            Pilih event, cek detailnya, lalu daftar lewat WhatsApp. Terbuka buat semua level.
          </p>
        </div>
      </section>

      <JadwalClient initialEvents={events} />
    </PublicShell>
  );
}
