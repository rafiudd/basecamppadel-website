/** Pulsing placeholder block for `loading.tsx` route fallbacks. `tone="dark"` for dark/indigo hero sections. */
export function Skeleton({ className = "", tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  return <div className={`animate-pulse rounded-lg ${tone === "dark" ? "bg-snow/12" : "bg-ink/8"} ${className}`} />;
}

/** Shared indigo hero skeleton (eyebrow + title + subtitle lines), matching `PageHeader`'s layout. */
export function HeroSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <section className="bg-indigo px-6 md:px-12 py-10 md:py-14">
      <div className="w-full max-w-[1440px] mx-auto">
        <div className="flex flex-col gap-3 max-w-[580px]">
          <Skeleton tone="dark" className="h-3.5 w-28" />
          <Skeleton tone="dark" className="h-9 w-3/4 max-w-[420px]" />
          {lines > 1 && <Skeleton tone="dark" className="h-4 w-full max-w-[480px]" />}
        </div>
      </div>
    </section>
  );
}

/** Grid of event/class card skeletons, matching the `md:grid-cols-2 lg:grid-cols-3` card grids. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <section className="px-6 md:px-12 py-8 md:py-10">
      <div className="w-full max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white border border-ink/8 rounded-2xl p-5 flex flex-col gap-3 shadow-xs">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3.5 w-1/3" />
          </div>
        ))}
      </div>
    </section>
  );
}
