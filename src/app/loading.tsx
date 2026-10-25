import { PublicShell } from "@/components/PublicShell";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <PublicShell>
      <section className="relative min-h-[640px] md:h-[760px] flex items-end overflow-hidden bg-ink px-6 md:px-12 pb-16 md:pb-[120px]">
        <div className="relative w-full max-w-[1104px] mx-auto">
          <div className="max-w-[800px] flex flex-col gap-5">
            <Skeleton tone="dark" className="h-4 w-56" />
            <Skeleton tone="dark" className="h-14 w-full max-w-[560px]" />
            <Skeleton tone="dark" className="h-4 w-full max-w-[480px]" />
            <Skeleton tone="dark" className="h-12 w-40 rounded-full" />
          </div>
        </div>
      </section>

      <section className="bg-snow px-6 md:px-12 py-10 md:py-14">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-5">
          <Skeleton className="h-8 w-56" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-72 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
