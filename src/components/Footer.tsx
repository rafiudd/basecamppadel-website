import { MountainMark } from "./Logo";

export function Footer() {
  return (
    <footer className="bg-ink text-snow/60 px-6 md:px-12 py-10 flex items-center justify-between flex-wrap gap-4 mt-auto">
      <div className="flex items-center gap-3">
        <MountainMark size={24} />
        <div className="font-display font-bold text-sm text-snow">BASECAMP PADEL</div>
      </div>
      <a
        href="https://instagram.com/basecamppadel"
        target="_blank"
        rel="noopener"
        className="font-sans text-sm text-snow/60 no-underline hover:text-volt"
      >
        @basecamppadel
      </a>
    </footer>
  );
}
