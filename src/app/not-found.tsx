import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";

export default function NotFound() {
  return (
    <PublicShell>
      <section className="px-6 md:px-12 py-24 max-w-[700px] mx-auto text-center flex flex-col items-center gap-4">
        <div className="font-display font-bold text-[64px] text-coral leading-none">404</div>
        <p className="font-sans text-ink/60">Halaman nggak ketemu.</p>
        <Link href="/" className="no-underline bg-ink text-snow rounded-full px-7 py-3.5 font-sans font-bold text-sm">Balik ke Home</Link>
      </section>
    </PublicShell>
  );
}
