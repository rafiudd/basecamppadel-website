import Link from "next/link";
import { getPublicCoaches, type CoachSummary } from "@/lib/server/coaches";
import { initials } from "@/lib/format";

export const revalidate = 60;

export const metadata = {
  title: "Coach — Basecamp Padel",
  description: "Kenalan sama coach-coach di Basecamp Padel, dari dasar sampai persiapan turnamen.",
};

/** A coach tile: the same coral-blob-behind-the-photo device as the leaderboard's player hero card,
 *  sized down to fit a grid instead of spanning the row. */
function CoachCard({ coach }: { coach: CoachSummary }) {
  return (
    <Link
      href={`/coach/${coach.slug}`}
      className="group relative flex flex-col items-center text-center gap-3 no-underline text-snow bg-indigo rounded-2xl pt-7 pb-5 px-4 overflow-hidden shadow-sm hover:shadow-xl transition-shadow"
    >
      <div className="absolute left-1/2 -translate-x-1/2 -top-10 w-[200px] h-[200px] rounded-full bg-coral opacity-90 transition-transform duration-300 group-hover:scale-105" />
      <div className="absolute left-1/2 -translate-x-1/2 -top-6 w-[240px] h-[240px] rounded-full bg-[radial-gradient(circle,rgba(255,236,200,.45)_0%,rgba(255,212,59,.15)_45%,rgba(255,90,60,0)_70%)]" />

      <div className="relative z-10 w-20 h-20 rounded-full ring-4 ring-snow/25 overflow-hidden shadow-lg bg-indigo/70">
        {coach.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- storage URL
          <img src={coach.photoUrl} alt={coach.name} className="w-full h-full object-cover" />
        ) : (
          <span className="w-full h-full flex items-center justify-center font-display font-bold text-xl text-snow/90">
            {initials(coach.name)}
          </span>
        )}
      </div>

      <div className="relative z-10 font-display font-bold text-lg group-hover:text-volt transition-colors">{coach.name}</div>

      <div className="relative z-10 flex flex-col gap-1.5 items-center text-caption text-snow/75">
        {coach.venueName && <span>{coach.venueName}</span>}
        {coach.position && <span>{coach.position}</span>}
      </div>

      {coach.classCount > 0 && (
        <span className="relative z-10 rounded-full bg-snow/12 text-snow text-caption font-bold px-2.5 py-1 mt-1">
          {coach.classCount} kelas
        </span>
      )}
    </Link>
  );
}

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {coaches.map((c) => (
                <CoachCard key={c.slug} coach={c} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
