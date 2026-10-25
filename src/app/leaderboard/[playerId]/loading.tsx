import { PublicShell } from "@/components/PublicShell";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <PublicShell>
      <section className="bg-indigo px-6 md:px-12 pt-4 md:pt-6 pb-8 overflow-hidden">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-4 max-w-[580px]">
          <Skeleton tone="dark" className="h-4 w-28" />
          <Skeleton tone="dark" className="h-16 w-2/3" />
          <div className="flex gap-2">
            <Skeleton tone="dark" className="h-7 w-16 rounded-full" />
            <Skeleton tone="dark" className="h-7 w-20 rounded-full" />
            <Skeleton tone="dark" className="h-7 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-[520px]">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} tone="dark" className="h-16 w-full rounded-[10px]" />
            ))}
          </div>
        </div>
      </section>

      <div className="px-6 md:px-12 py-8">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    </PublicShell>
  );
}
