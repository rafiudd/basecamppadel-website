import Link from "next/link";

/** Light page frame of the account forms (Lengkapi, Ini kamu?, Edit): optional back link, title, intro. */
export function AccountPageLayout({
  title,
  intro,
  back,
  narrow,
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  back?: { href: string; label: string };
  narrow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 md:px-12 pt-8 pb-14 md:pt-12 md:pb-18">
      <div className={`${narrow ? "max-w-160" : "max-w-190"} mx-auto flex flex-col gap-6 text-ink`}>
        <div>
          {back && (
            <Link href={back.href} className="no-underline text-sm font-semibold text-ink/60 hover:text-indigo">
              ← {back.label}
            </Link>
          )}
          <h1 className={`font-display font-bold text-[30px] md:text-[40px] leading-[1.05] mb-0 ${back ? "mt-2" : "mt-0"}`}>{title}</h1>
          {intro && <p className="mt-2 mb-0 text-base text-ink/70 leading-copy">{intro}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
