import { notFound } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { getCoachProfile } from "@/lib/server/coaches";
import { formatRupiah } from "@/lib/format";
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
      <section className="bg-indigo text-snow px-6 md:px-12 py-12 md:py-16">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <Avatar name={coach.name} photoUrl={coach.photoUrl} size={88} />
          <div className="flex flex-col gap-2 min-w-0">
            <span className="font-bold text-xs md:text-sm tracking-widest text-volt uppercase">Coach</span>
            <h1 className="font-display font-bold text-3xl md:text-5xl text-snow m-0 leading-tight">{coach.name}</h1>
            <div className="flex items-center gap-3 flex-wrap text-sm text-snow/80">
              {coach.level && <span className="rounded-full bg-snow/12 px-3 py-1 font-semibold">{coach.level}</span>}
              {coach.totalReviews > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Stars rating={coach.averageRating} />
                  <span>{coach.averageRating.toFixed(1)} ({coach.totalReviews} ulasan)</span>
                </span>
              )}
              {coach.instagram && (
                <a
                  href={`https://instagram.com/${coach.instagram.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-volt font-semibold no-underline hover:underline"
                >
                  @{coach.instagram.replace(/^@/, "")}
                </a>
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
                    className="flex flex-col gap-1.5 no-underline text-ink border border-ink/8 rounded-2xl p-4 hover:border-indigo bg-white"
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
                    className="flex items-center justify-between gap-3 no-underline text-ink border border-ink/8 rounded-xl px-4 py-3 hover:border-indigo bg-white"
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
                  <div key={i} className="border border-ink/8 rounded-2xl p-4 bg-white">
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
