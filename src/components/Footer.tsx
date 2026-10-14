import Link from "next/link";
import { MountainMark } from "./Logo";

const linkClass = "font-sans text-sm text-snow/60 no-underline hover:text-volt transition-colors";

export function Footer() {
  return (
    <footer className="bg-ink text-snow/60 px-6 md:px-12 pt-10 pb-24 md:py-10 flex items-center justify-between flex-wrap gap-4 mt-auto">
      <div className="flex items-center gap-3">
        <MountainMark size={24} />
        <div className="font-display font-bold text-sm text-snow">BASECAMP PADEL</div>
      </div>
      <div className="flex items-center gap-5 flex-wrap">
        <Link href="/privasi" className={linkClass}>
          Privasi
        </Link>
        <Link href="/syarat" className={linkClass}>
          Syarat
        </Link>
        <a href="https://instagram.com/basecamppadel" target="_blank" rel="noopener" className={linkClass}>
          @basecamppadel
        </a>
      </div>
    </footer>
  );
}
