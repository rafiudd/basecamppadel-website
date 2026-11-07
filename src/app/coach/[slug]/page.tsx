import { notFound } from "next/navigation";
import Link from "next/link";
import { getCoachProfile } from "@/lib/server/coaches";
import { formatRupiah, initials } from "@/lib/format";
import { CATEGORY_LABELS, formatReviewDate, formatScheduleFriendly } from "@/lib/kelasRules";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const coach = await getCoachProfile(slug);
  if (!coach) return { title: "Coach Tidak Ditemukan — Basecamp Padel" };
  return {
    title: `Coach ${coach.name} — Basecamp Padel`,
    description: coach.bio || `Profil Coach ${coach.name} di Basecamp Padel.`,
  };
}

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-hidden className="text-volt text-sm tracking-tight">
      {"★".repeat(Math.round(rating))}
      <span className="text-ink/20">{"★".repeat(5 - Math.round(rating))}</span>
    </span>
  );
}

export default async function CoachProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const coach = await getCoachProfile(slug);
  if (!coach) notFound();

  return (
    <div className="text-ink flex flex-col">
      <section className="relative bg-indigo text-snow px-6 md:px-12 pt-10 md:pt-14 pb-14 md:pb-20 overflow-hidden">
        {/* Big coral circle, same device as the leaderboard player hero */}
        <div className="absolute -bottom-[220px] md:bottom-auto md:top-1/2 md:-translate-y-1/2 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:-right-[560px] w-[620px] h-[620px] md:w-[820px] md:h-[820px] rounded-full bg-[linear-gradient(165deg,#FF5A3C_0%,#F26A45_55%,#E4573D_100%)]" />

        <div className="relative z-10 w-full max-w-[1440px] mx-auto flex flex-col md:flex-row items-center md:items-end justify-between gap-8">
          <div className="flex-1 flex flex-col gap-4 min-w-0 text-center md:text-left items-center md:items-start">
            <Link href="/coach" className="no-underline text-snow/75 font-sans font-semibold text-sm hover:text-volt transition-colors inline-flex items-center gap-1">
              ← Coach
            </Link>
            <span className="font-bold text-xs md:text-sm tracking-widest text-volt uppercase">Coach</span>
            <h1 className="font-display font-bold text-4xl md:text-6xl text-snow m-0 leading-tight">{coach.name}</h1>
            <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-start">
              {coach.level && <span className="rounded-full bg-snow/12 px-3.5 py-1.5 text-sm font-bold">{coach.level}</span>}
              {coach.totalReviews > 0 && (
                <span className="rounded-full bg-snow/12 px-3.5 py-1.5 text-sm font-bold inline-flex items-center gap-1.5">
                  <Stars rating={coach.averageRating} />
                  <span>{coach.averageRating.toFixed(1)} ({coach.totalReviews})</span>
                </span>
              )}
              {coach.instagram && (
                <a
                  href={`https://instagram.com/${coach.instagram.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-snow/12 px-3.5 py-1.5 text-sm font-bold text-volt no-underline hover:bg-snow/20"
                >
                  @{coach.instagram.replace(/^@/, "")}
                </a>
              )}
            </div>
          </div>

          {/* Photo, with a soft glow behind it like the coaching rapor header */}
          <div className="relative flex-none w-[180px] h-[180px] md:w-[240px] md:h-[240px]">
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-[30px] w-[280px] h-[280px] md:w-[360px] md:h-[360px] rounded-full bg-[radial-gradient(circle,rgba(190,130,150,.55)_0%,rgba(120,80,140,.25)_40%,rgba(27,22,80,0)_70%)]" />
            <div className="relative w-full h-full rounded-full ring-4 ring-snow/20 overflow-hidden shadow-xl bg-indigo/60">
              {coach.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- storage URL, variable aspect
                <img src={coach.photoUrl} alt={coach.name} className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center font-display font-bold text-5xl md:text-6xl text-snow/85">
                  {initials(coach.name)}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 py-8 md:py-12 bg-snow">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-8 md:gap-10">
          {coach.bio && (
            <div className="max-w-2xl">
              <h2 className="font-display font-bold text-xl m-0 mb-2">Tentang Coach {coach.name}</h2>
              <p className="m-0 text-sm leading-copy text-ink/75 whitespace-pre-wrap">{coach.bio}</p>
            </div>
          )}

          {coach.classes.length > 0 && (
            <div>
              <h2 className="font-display font-bold text-xl m-0 mb-3">Kelas yang diajar</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {coach.classes.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/kelas/${c.slug}`}
                    className="flex flex-col gap-1.5 no-underline text-ink border border-ink/8 rounded-2xl p-4 bg-white shadow-sm hover:shadow-md hover:border-indigo hover:-translate-y-0.5 transition-all"
                  >
                    <span className="text-caption text-ink/55 font-semibold">{CATEGORY_LABELS[c.category] ?? c.category}</span>
                    <span className="font-display font-bold text-base">{c.title}</span>
                    <span className="text-sm text-indigo font-semibold">{formatRupiah(c.price)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {coach.upcomingSchedules.length > 0 && (
            <div>
              <h2 className="font-display font-bold text-xl m-0 mb-3">Jadwal mendatang</h2>
              <div className="flex flex-col gap-2.5 max-w-xl">
                {coach.upcomingSchedules.map((s, i) => (
                  <Link
                    key={i}
                    href={`/kelas/${s.classSlug}`}
                    className="flex items-center justify-between gap-3 no-underline text-ink border border-ink/8 rounded-xl px-4 py-3 bg-white shadow-sm hover:shadow-md hover:border-indigo transition-all"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold text-sm truncate">{s.classTitle}</span>
                      <span className="block text-caption text-ink/60">{s.venueName}</span>
                    </span>
                    <span className="flex-none text-caption font-semibold text-indigo whitespace-nowrap">
                      {formatScheduleFriendly(s.datesLabel, s.timeRange)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {coach.reviews.length > 0 && (
            <div>
              <h2 className="font-display font-bold text-xl m-0 mb-3">Ulasan murid</h2>
              <div className="flex flex-col gap-3 max-w-2xl">
                {coach.reviews.map((r, i) => (
                  <div key={i} className="border border-ink/8 rounded-2xl p-4 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">{r.authorName}</span>
                      <Stars rating={r.rating} />
                    </div>
                    <p className="m-0 mt-1.5 text-sm text-ink/75 leading-copy">{r.content}</p>
                    <div className="mt-1.5 text-caption text-ink/50">{r.classTitle} · {formatReviewDate(r.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
