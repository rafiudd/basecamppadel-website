import { PublicShell } from "@/components/PublicShell";
import { getLeaderboard } from "@/lib/leaderboard";
import { LeaderboardClient } from "@/components/leaderboard/LeaderboardClient";

export const revalidate = 0;

export default async function LeaderboardPage() {
  const data = await getLeaderboard();

  return (
    <PublicShell>
      <LeaderboardClient initialData={data} />
    </PublicShell>
  );
}
