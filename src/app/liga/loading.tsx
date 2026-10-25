import { PublicShell } from "@/components/PublicShell";
import { HeroSkeleton, CardGridSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <PublicShell>
      <HeroSkeleton />
      <CardGridSkeleton count={4} />
    </PublicShell>
  );
}
