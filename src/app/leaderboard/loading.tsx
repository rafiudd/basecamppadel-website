import { PublicShell } from "@/components/PublicShell";
import { HeroSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <PublicShell>
      <HeroSkeleton />
      <section className="bg-snow px-6 md:px-12 py-8 md:py-16">
        <div className="w-full max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
