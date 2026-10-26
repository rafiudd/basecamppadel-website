import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Instant fallback for any /admin/* page while it loads — AdminLayout (header/nav) stays mounted
 * across the navigation and isn't re-fetched, so this only needs to cover the content area.
 * Generic on purpose: admin pages vary too much (tables, forms, dashboards) for a per-route shape.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton tone="dark" className="h-6 w-48" />
          <Skeleton tone="dark" className="h-4 w-72" />
        </div>
        <Skeleton tone="dark" className="h-10 w-32 rounded-lg" />
      </div>
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} tone="dark" className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
