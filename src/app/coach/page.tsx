import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { getPublicCoaches } from "@/lib/server/coaches";

export const revalidate = 60;

export const metadata = {
  title: "Coach — Basecamp Padel",
  description: "Kenalan sama coach-coach di Basecamp Padel, dari dasar sampai persiapan turnamen.",
};

export default async function CoachDirectoryPage() {
  const coaches = await getPublicCoaches();

  return (
    <div className="text-ink flex flex-col">
      <section className="relative bg-indigo text-snow px-6 md:px-12 py-12 md:py-16 overflow-hidden">
        <div className="absolute -top-[260px] -right-[260px] w-[520px] h-[520px] rounded-full bg-[linear-gradient(165deg,#FF5A3C_0%,#F26A45_55%,#E4573D_100%)] opacity-90" />
        <div className="relative z-10 w-full max-w-[1440px] mx-auto flex flex-col gap-2.5">
          <span className="font-bold text-xs md:text-sm tracking-widest text-volt uppercase">Coach</span>
          <h1 className="font-display font-bold text-3xl md:text-5xl text-snow m-0 leading-tight">
            Kenalan sama coach kamu
          </h1>
          <p className="text-sm md:text-base text-snow/75 m-0 leading-relaxed max-w-xl">
            Semua coach Basecamp Padel, dari yang pegang kelas dasar sampai persiapan turnamen.
          </p>
        </div>
      </section>

      <section className="px-6 md:px-12 py-8 md:py-12 bg-snow">
        <div className="w-full max-w-[1440px] mx-auto">
          {coaches.length === 0 ? (
            <p className="m-0 text-sm text-ink/60">Belum ada profil coach yang tayang.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {coaches.map((c) => (
                <Link
                  key={c.slug}
                  href={`/coach/${c.slug}`}
                  className="flex flex-col items-center text-center gap-3 no-underline text-ink border border-ink/8 rounded-2xl p-5 bg-white shadow-sm hover:shadow-lg hover:border-indigo hover:-translate-y-1 transition-all"
                >
                  <span className="rounded-full ring-2 ring-indigo/10">
                    <Avatar name={c.name} photoUrl={c.photoUrl} size={80} />
                  </span>
                  <div>
                    <div className="font-display font-bold text-base">{c.name}</div>
                    {c.level && <div className="text-caption text-ink/55 mt-0.5">{c.level}</div>}
                  </div>
                  {c.classCount > 0 && (
                    <span className="rounded-full bg-indigo/8 text-indigo text-caption font-bold px-2.5 py-1">{c.classCount} kelas</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
