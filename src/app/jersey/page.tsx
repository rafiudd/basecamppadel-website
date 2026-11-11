import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { JerseyCarousel } from "@/components/jersey/JerseyCarousel";

export const metadata: Metadata = {
  title: "Pre-order Jersey — Basecamp Padel",
  description: "Isi form pre-order jersey Basecamp Padel.",
};

export default function JerseyPage() {
  return (
    <PublicShell>
      <section className="bg-indigo px-6 md:px-12 py-12 md:py-14 text-snow">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-2.5">
          <div className="font-sans font-bold text-sm tracking-[0.1em] text-[#FFD43B] uppercase">Pre-order</div>
          <h1 className="font-display font-bold text-3xl sm:text-[38px] leading-[1.15] m-0 text-snow">Jersey Basecamp Padel</h1>
          <p className="font-sans text-base text-snow/75 leading-relaxed m-0 max-w-[560px]">Isi form di bawah buat pre-order jersey.</p>
        </div>
      </section>

      <JerseyCarousel />

      <div className="w-full max-w-[680px] mx-auto px-6 py-10">
        <iframe
          src="https://docs.google.com/forms/d/e/1FAIpQLSfxJxpgKOIVk-AYItn4fbVGbfyB1OQM5w_ke58iV5g4DgJb_w/viewform?embedded=true"
          width="100%"
          height={1300}
          className="border-0"
          title="Form pre-order jersey"
        >
          Loading…
        </iframe>
      </div>
    </PublicShell>
  );
}
