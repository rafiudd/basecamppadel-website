import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <>
      <section className="bg-indigo px-6 md:px-12 py-10 md:py-16">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-3 max-w-[580px]">
          <Skeleton tone="dark" className="h-4 w-24" />
          <Skeleton tone="dark" className="h-10 w-full max-w-[420px]" />
          <Skeleton tone="dark" className="h-4 w-full max-w-[480px]" />
        </div>
      </section>
      <section className="px-6 md:px-12 py-8 md:py-12">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-4">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </section>
    </>
  );
}
