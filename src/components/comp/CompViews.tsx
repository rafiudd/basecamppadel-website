import type { GroupView } from "@/lib/compData";
import { STAGE_LABEL, type KoStage } from "@/lib/competition";
import type { EventStatus, Match } from "@/lib/database.types";

/** Shared (admin + public) views of a competition: badges, group tables, bracket. Dark cards. */

const BADGE_TONES = {
  coral: "bg-coral/20 text-[#FF8A73]",
  volt: "bg-volt/15 text-volt",
  win: "bg-win/20 text-[#6FD39A]",
  muted: "bg-snow/10 text-snow/85",
  live: "bg-coral text-snow",
} as const;

export function Badge({ tone, children }: { tone: keyof typeof BADGE_TONES; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-xs font-bold whitespace-nowrap ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: EventStatus }) {
  if (status === "active") return <Badge tone="win">● Berjalan</Badge>;
  if (status === "finished") return <Badge tone="volt">Selesai</Badge>;
  return <Badge tone="muted">Draft</Badge>;
}

export function Initials({ name }: { name: string }) {
  const parts = name.split("/").map((s) => s.trim()[0] ?? "");
  return (
    <span className="w-8 h-8 rounded-full bg-indigo text-volt text-[11px] font-bold flex items-center justify-center flex-none">
      {parts.join("").slice(0, 2).toUpperCase()}
    </span>
  );
}

export function StandingsTable({ group, advance }: { group: GroupView; advance: number }) {
  const teamName = (id: string) => group.teams.find((t) => t.id === id)?.name ?? "—";
  return (
    <div className="bg-ink-3 rounded-[14px] p-4 md:p-5 text-snow">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="font-display font-bold text-lg">Grup {group.label}</div>
        {group.complete ? <Badge tone="win">Selesai</Badge> : <Badge tone="muted">Berjalan</Badge>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-snow/60 uppercase tracking-wide">
              <th className="py-2 pr-2 font-semibold w-8">#</th>
              <th className="py-2 pr-3 font-semibold">Tim</th>
              <th className="py-2 pr-3 font-semibold text-center">Menang</th>
              <th className="py-2 pr-3 font-semibold text-center">M</th>
              <th className="py-2 pr-3 font-semibold text-center">W–L</th>
              <th className="py-2 font-semibold text-right">Game</th>
            </tr>
          </thead>
          <tbody>
            {group.standings.map((r) => {
              const qualifies = r.rank <= advance;
              return (
                <tr key={r.teamId} className="border-t border-snow/10">
                  <td className={`py-2.5 pr-2 font-display font-bold ${qualifies ? "text-volt" : "text-snow/60"}`}>{r.rank}</td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{teamName(r.teamId)}</span>
                      {qualifies && group.complete && <Badge tone="win">Lolos · {group.label}{r.rank}</Badge>}
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-center font-display font-bold">{r.wins}</td>
                  <td className="py-2.5 pr-3 text-center text-snow/75">{r.played}</td>
                  <td className="py-2.5 pr-3 text-center text-snow/75">{r.wins}–{r.losses}</td>
                  <td className="py-2.5 text-right whitespace-nowrap text-snow/75">
                    {r.gw}–{r.gl} <span className={r.diff >= 0 ? "text-[#6FD39A]" : "text-[#FF8A73]"}>({r.diff > 0 ? "+" : r.diff < 0 ? "−" : ""}{Math.abs(r.diff)})</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!group.complete && <p className="text-xs text-snow/50 mt-2">Top {advance} lolos ke knockout setelah semua match grup selesai.</p>}
    </div>
  );
}

export function MatchStatus({ m }: { m: Match }) {
  if (m.is_bye) return <Badge tone="muted">Bye</Badge>;
  if (m.status === "finished") return <Badge tone="win">Selesai{m.is_wo ? " · WO" : ""}</Badge>;
  if (m.is_live) return <Badge tone="live">● ON AIR</Badge>;
  if (m.status === "live") return <Badge tone="coral">● LIVE</Badge>;
  if (!m.team_a_id || !m.team_b_id) return <Badge tone="muted">Menunggu</Badge>;
  return <Badge tone="muted">Siap</Badge>;
}

/** Team row inside a match box. */
function TeamLine({ name, seed, score, winner, showScore }: { name: string; seed?: string; score: number; winner: boolean; showScore: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${winner ? "text-snow" : "text-snow/75"}`}>
      {seed && <span className="text-[11px] font-bold text-volt/80 w-6 flex-none">{seed}</span>}
      <span className={`flex-1 min-w-0 truncate text-sm ${winner ? "font-bold" : "font-medium"}`}>{name}</span>
      {showScore && <span className="font-display font-bold text-base tabular-nums">{score}</span>}
    </div>
  );
}

export function Bracket({
  rounds,
  seeds,
  waitingLabel,
}: {
  rounds: { stage: KoStage; matches: Match[] }[];
  seeds: Record<string, string>;
  waitingLabel: (m: Match, side: "A" | "B") => string;
}) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="flex gap-4 min-w-max">
        {rounds.map((r) => (
          <div key={r.stage} className="w-[240px] flex flex-col">
            <div className="text-xs font-bold tracking-[0.08em] text-snow/70 uppercase mb-3">{STAGE_LABEL[r.stage]}</div>
            <div className="flex flex-col justify-around gap-3 flex-1">
              {r.matches.map((m) => {
                const done = m.status === "finished";
                const showScore = done && !m.is_bye && !m.is_wo;
                return (
                  <div key={m.id} className={`rounded-xl p-3 flex flex-col gap-1.5 ${m.is_live ? "bg-indigo ring-2 ring-coral" : "bg-ink-3"}`}>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-snow/60">
                      <span>{m.stage === "final" ? "Final" : `${STAGE_LABEL[m.stage as KoStage]} ${m.bracket_pos}`}</span>
                      <MatchStatus m={m} />
                    </div>
                    {m.is_bye ? (
                      <TeamLine name={`${m.team_a_name !== "TBD" ? m.team_a_name : m.team_b_name} · lolos otomatis`} seed={seeds[(m.team_a_id ?? m.team_b_id)!]} score={0} winner showScore={false} />
                    ) : (
                      <>
                        <TeamLine
                          name={m.team_a_id ? m.team_a_name : waitingLabel(m, "A")}
                          seed={m.team_a_id ? seeds[m.team_a_id] : undefined}
                          score={m.team_a_games}
                          winner={done && m.winner_team_id === m.team_a_id}
                          showScore={showScore || m.status === "live"}
                        />
                        <TeamLine
                          name={m.team_b_id ? m.team_b_name : waitingLabel(m, "B")}
                          seed={m.team_b_id ? seeds[m.team_b_id] : undefined}
                          score={m.team_b_games}
                          winner={done && m.winner_team_id === m.team_b_id}
                          showScore={showScore || m.status === "live"}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** "Pemenang SF1" style placeholder for a knockout slot whose team is not known yet. */
export function feederLabel(all: Match[]) {
  return (m: Match, side: "A" | "B") => {
    const feeder = all.find((f) => f.next_match_id === m.id && f.next_slot === side);
    if (!feeder) return "TBD";
    const short: Record<string, string> = { r16: "R16-", qf: "QF", sf: "SF" };
    return `Pemenang ${short[feeder.stage ?? ""] ?? ""}${feeder.bracket_pos ?? ""}`;
  };
}

/** teamId -> "A1", "B2" … from final group standings. */
export function seedMap(groups: GroupView[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const g of groups) for (const r of g.standings) out[r.teamId] = `${g.label}${r.rank}`;
  return out;
}
