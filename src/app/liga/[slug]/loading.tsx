import { PublicShell } from "@/components/PublicShell";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <PublicShell>
      <section className="bg-[#1F4A2C] px-6 md:px-12 py-10 md:py-16">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-4">
          <Skeleton tone="dark" className="h-4 w-24" />
          <Skeleton tone="dark" className="h-16 w-full max-w-[420px]" />
          <Skeleton tone="dark" className="h-4 w-full max-w-[480px]" />
          <Skeleton tone="dark" className="h-12 w-40 rounded-full" />
        </div>
      </section>

      <section className="px-6 md:px-12 py-10 md:py-16">
        <div className="w-full max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </section>
    </PublicShell>
  );
}
