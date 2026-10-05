import { StandingsTable } from "@/components/comp/StandingsTable";
import { EmptyState } from "@/components/ui/EmptyState";
import type { CompetitionData } from "@/lib/compData";
import { sectionTitle } from "@/components/admin/event/types";

export function KlasemenTab({ data }: { data: CompetitionData }) {
  return (
    <div className="flex flex-col gap-4">
      <div className={sectionTitle}>Klasemen fase grup</div>
      {data.groups.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.groups.map((g) => <StandingsTable key={g.label} group={g} advance={data.event.advance_per_group} />)}
        </div>
      ) : (
        <EmptyState>Klasemen muncul setelah tim dibagi ke grup.</EmptyState>
      )}
    </div>
  );
}
