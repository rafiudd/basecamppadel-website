import { PublicShell } from "@/components/PublicShell";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <PublicShell>
      <section className="bg-indigo px-6 md:px-12 py-8 md:py-10">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-4">
          <div className="flex gap-2">
            <Skeleton tone="dark" className="h-6 w-20 rounded-full" />
            <Skeleton tone="dark" className="h-6 w-28 rounded-full" />
          </div>
          <Skeleton tone="dark" className="h-10 w-2/3 max-w-[480px]" />
          <div className="flex gap-4">
            <Skeleton tone="dark" className="h-4 w-36" />
            <Skeleton tone="dark" className="h-4 w-28" />
            <Skeleton tone="dark" className="h-4 w-44" />
          </div>
        </div>
      </section>

      <div className="px-6 md:px-12 pt-6">
        <div className="w-full max-w-[1440px] mx-auto flex gap-2.5 flex-wrap">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-full" />
          ))}
        </div>
      </div>

      <div className="px-6 md:px-12 py-6">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    </PublicShell>
  );
}
