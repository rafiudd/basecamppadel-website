import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { teamNameOf, type GroupView } from "@/lib/compData";

/** Poin shown in the group table: 3 per win (ranking itself is by wins, see computeStandings). */
const GROUP_POINTS_PER_WIN = 3;

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");
const th = "pb-2.5 pr-2.5 font-semibold text-xs text-snow/65 uppercase tracking-table whitespace-nowrap";

export function StandingsTable({ group, advance }: { group: GroupView; advance: number }) {
  return (
    <div className="bg-ink-2 rounded-card px-4.5 py-4 min-w-0 text-snow">
      <div className="flex items-center justify-between mb-1.5">
        <div className="font-display font-bold text-lg">Grup {group.label}</div>
        {group.complete ? <Badge tone="win">Selesai</Badge> : <Badge tone="faint">Berjalan</Badge>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={`${th} text-left`}>#</th>
              <th className={`${th} text-left`}>Tim</th>
              <th className={`${th} text-center`}>Poin</th>
              <th className={`${th} text-center`}>M</th>
              <th className={`${th} text-center`}>W</th>
              <th className={`${th} text-center`}>L</th>
              <th className={`${th} pr-0 text-center`}>Selisih</th>
            </tr>
          </thead>
          <tbody>
            {group.standings.map((r) => {
              const name = teamNameOf(group.teams, r.teamId);
              return (
                <tr key={r.teamId} className="border-t border-snow/10">
                  <td className="py-2.5 pr-2.5 w-5 font-display font-bold text-input text-snow/75">{r.rank}</td>
                  <td className="py-2.5 pr-2.5">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={name} />
                      <span className="font-display font-bold text-sm whitespace-nowrap">{name}</span>
                      {r.rank <= advance && <Badge tone="volt">Lolos · {group.label}{r.rank}</Badge>}
                    </span>
                  </td>
                  <td className="py-2.5 pr-2.5 text-center font-display font-bold text-base">{r.wins * GROUP_POINTS_PER_WIN}</td>
                  <td className="py-2.5 pr-2.5 text-center text-snow/80">{r.played}</td>
                  <td className="py-2.5 pr-2.5 text-center text-snow/80">{r.wins}</td>
                  <td className="py-2.5 pr-2.5 text-center text-snow/80">{r.losses}</td>
                  <td className="py-2.5 text-center text-snow/80">{signed(r.diff)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
