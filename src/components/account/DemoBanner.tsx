import Link from "next/link";

const STEPS = [
  { href: "/akun-demo/lengkapi", label: "1. Lengkapi profil" },
  { href: "/akun-demo/sambungkan", label: "2. Ini kamu?" },
  { href: "/akun-demo", label: "3. Profil" },
  { href: "/akun-demo/edit", label: "4. Edit profil" },
];

/** Strip on top of every /akun-demo page: says it is sample data and jumps between the steps. */
export function DemoBanner({ current, children }: { current: string; children?: React.ReactNode }) {
  return (
    <div className="bg-volt text-ink px-4 md:px-12 py-2.5">
      <div className="max-w-276 mx-auto flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-x-4 md:gap-y-1.5">
        <div className="text-caption font-bold whitespace-nowrap">Mode demo · data contoh, tidak tersimpan</div>
        <nav aria-label="Langkah demo" className="flex gap-1.5 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          {STEPS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              aria-current={current === s.href ? "page" : undefined}
              className={`no-underline whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${
                current === s.href ? "bg-ink text-snow" : "bg-ink/10 text-ink hover:bg-ink/20"
              }`}
            >
              {s.label}
            </Link>
          ))}
          <Link href="/masuk" className="no-underline whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold text-ink/70 hover:text-ink">
            Keluar demo
          </Link>
        </nav>
        {children && <div className="text-xs text-ink/75 md:basis-full">{children}</div>}
      </div>
    </div>
  );
}
