import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { PageHeader } from "@/components/PageHeader";
import { getPublishedSessions } from "@/lib/queries";
import { formatSessionDay } from "@/lib/format";
import { WHATSAPP_URL } from "@/lib/config";

export const revalidate = 60;
export const metadata: Metadata = { title: "Jadwal — Basecamp Padel" };

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-snow/50 text-xs uppercase tracking-[0.06em]">{label}</div>
      <div className="font-semibold mt-1">{value}</div>
    </div>
  );
}

export default async function JadwalPage() {
  const sessions = await getPublishedSessions();

  return (
    <PublicShell>
      <PageHeader eyebrow="Jadwal" title="Sesi & Mabar Minggu Ini" />
      <section className="px-6 md:px-12 py-12 md:py-16 max-w-[1200px] mx-auto grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
        {sessions.length === 0 && (
          <p className="font-sans text-ink/60 col-span-full">
            Belum ada sesi yang dijadwalkan. Cek lagi nanti atau tanya di WhatsApp.
          </p>
        )}
        {sessions.map((s) => (
          <article
            key={s.id}
            className="bg-indigo rounded-2xl p-7 flex flex-col gap-4 text-snow"
          >
            <div className="font-sans font-bold text-[13px] tracking-[0.08em] text-volt uppercase">{s.tag}</div>
            <h2 className="font-display font-bold text-2xl">{s.title}</h2>
            <div className="grid grid-cols-2 gap-3 font-sans text-sm">
              <Detail label="Venue" value={s.venue} />
              <Detail label="Hari" value={formatSessionDay(s.session_date)} />
              <Detail label="Jam" value={s.time_range} />
              <Detail label="Harga" value={s.price} />
            </div>
            <a
              href={s.whatsapp_url || WHATSAPP_URL}
              target="_blank"
              rel="noopener"
              className="no-underline text-center bg-coral text-snow rounded-full py-3.5 font-sans font-bold text-sm mt-auto"
            >
              Daftar via WhatsApp
            </a>
          </article>
        ))}
      </section>
    </PublicShell>
  );
}
