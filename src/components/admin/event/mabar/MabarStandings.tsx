import { Avatar } from "@/components/ui/Avatar";
import type { MabarRow } from "@/lib/mabar";

/**
 * Table: games (or games per match when match counts differ) → wins → difference → head-to-head →
 * lottery. The preset's winning places are highlighted once scores exist.
 */
export function MabarStandings({ rows, doneRounds, rankCount, presetName }: { rows: MabarRow[]; doneRounds: number; rankCount: number; presetName: string | null }) {
  const uneven = new Set(rows.filter((r) => r.played).map((r) => r.played)).size > 1;
  return (
    <div className="bg-ink-3 rounded-2xl px-5 py-4.5 flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <div className="font-display font-bold text-lg">Klasemen</div>
        <div className="text-xs text-snow/70">{doneRounds ? `setelah ronde ${doneRounds}` : "belum ada skor"}</div>
      </div>
      {rows.map((r, i) => (
        <div key={r.key} className={`flex items-center gap-2.5 py-2 ${i ? "border-t border-snow/8" : ""}`}>
          <div className={`font-display font-bold w-5.5 text-center ${r.rank <= rankCount && doneRounds ? "text-volt" : "text-snow/75"}`}>{r.rank}</div>
          <Avatar name={r.name} size={30} />
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-sm truncate">{r.name}</div>
            {r.played > 0 && <div className="text-2xs text-snow/60">{r.played} main · {r.wins}M {r.draws}S {r.losses}K · {r.diff > 0 ? "+" : ""}{r.diff}</div>}
          </div>
          <div className="text-right">
            <div className="font-bold text-sm">{r.games}</div>
            {uneven && r.played > 0 && <div className="text-2xs text-snow/60">{r.avg.toFixed(1)}/match</div>}
          </div>
        </div>
      ))}
      <div className="text-xs leading-normal text-snow/70 pt-2">
        {uneven && "Jumlah main tidak sama, urutan pakai rata-rata game per match. "}
        Di akhir event, juara 1{rankCount > 1 ? `–${rankCount}` : ""} dapat poin leaderboard{presetName ? ` sesuai preset "${presetName}"` : ""}.
      </div>
    </div>
  );
}
