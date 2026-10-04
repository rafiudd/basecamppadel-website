import { MatchStatus } from "@/components/comp/MatchStatus";
import { courtNameOf, isoToWibTime } from "@/lib/compData";
import { koShort, matchTeams, type Seed } from "@/lib/compLabels";
import { STAGE_LABEL, type KoStage } from "@/lib/competition";
import type { Court, Match } from "@/lib/database.types";

// Fixed geometry, as in the design: columns of 300px, 68px apart; first-round matches 128px apart.
const COL_W = 300;
const COL_GAP = 68;
const PITCH = 128;
const CARD_H = 108; // 22 label + 6 gap + 2 × 40 rows
const BOX_MID = 68; // label + gap + one row: where a connector meets the box

/** Top of match `j` in round `r`: each round sits centred between its two feeders. */
const cardTop = (r: number, j: number) => ((2 ** r - 1) * PITCH) / 2 + j * 2 ** r * PITCH;
const colLeft = (r: number) => r * (COL_W + COL_GAP);

type Rounds = { stage: KoStage; matches: Match[] }[];

/** Knockout bracket with connector lines; scrolls sideways on small screens. */
export function Bracket({ rounds, all, seeds, courts }: { rounds: Rounds; all: Match[]; seeds: Record<string, Seed>; courts: Pick<Court, "id" | "name">[] }) {
  const firstCount = rounds[0]?.matches.length ?? 0;
  const height = Math.max(CARD_H, firstCount * PITCH - (PITCH - CARD_H));
  const width = rounds.length * COL_W + (rounds.length - 1) * COL_GAP;

  return (
    <div className="overflow-x-auto -mx-1 px-1 pb-1">
      <div className="relative flex-none" style={{ width, height: height + 36 }}>
        {rounds.map((r, ri) => (
          <div key={r.stage} className="absolute top-0 font-display font-bold text-base" style={{ left: colLeft(ri), width: COL_W }}>
            {STAGE_LABEL[r.stage]}
          </div>
        ))}
        <div className="absolute left-0 top-9" style={{ width, height }}>
          {rounds.map((r, ri) =>
            r.matches.map((m, j) => (
              <div key={m.id}>
                <BracketMatch m={m} first={ri === 0} all={all} seeds={seeds} courts={courts} style={{ left: colLeft(ri), top: cardTop(ri, j), width: COL_W }} />
                {ri < rounds.length - 1 && j % 2 === 0 && <Connector x={colLeft(ri) + COL_W} y1={cardTop(ri, j) + BOX_MID} y2={cardTop(ri, j + 1) + BOX_MID} />}
              </div>
            )),
          )}
        </div>
      </div>
    </div>
  );
}

/** ⊐-shaped line joining two feeder matches, then a short line into the next round. */
function Connector({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  return (
    <>
      <div className="absolute z-1 border-2 border-l-0 border-snow/25 rounded-r-md box-border" style={{ left: x, top: y1, width: COL_GAP / 2, height: y2 - y1 }} />
      <div className="absolute z-1 h-0.5 bg-snow/25" style={{ left: x + COL_GAP / 2, top: (y1 + y2) / 2 - 1, width: COL_GAP / 2 }} />
    </>
  );
}

function BracketMatch({
  m,
  first,
  all,
  seeds,
  courts,
  style,
}: {
  m: Match;
  first: boolean;
  all: Match[];
  seeds: Record<string, Seed>;
  courts: Pick<Court, "id" | "name">[];
  style: React.CSSProperties;
}) {
  const done = m.status === "finished";
  const showScore = (done || m.status === "live") && !m.is_bye && !m.is_wo;
  const where = [m.court_id ? courtNameOf(courts, m.court_id) : null, m.starts_at ? isoToWibTime(m.starts_at) : null];
  const label = first
    ? m.stage === "final" ? "Final" : `${STAGE_LABEL[m.stage as KoStage]} · ${koShort(m)}`
    : [koShort(m), ...where].filter(Boolean).join(" · ");
  const names = matchTeams(m, all);
  const team = (id: string | null, name: string, games: number, isFirst: boolean) => (
    <BracketTeam
      first={isFirst}
      seed={id ? seeds[id] : undefined}
      name={id ? name : m.is_bye ? "Bye" : name}
      pending={!id}
      score={showScore ? String(games) : ""}
      winner={done && !!id && m.winner_team_id === id}
    />
  );

  return (
    <div className="absolute z-2 flex flex-col gap-1.5" style={style}>
      <div className="flex items-center justify-between gap-2 h-5.5">
        <span className="text-2xs font-bold tracking-tag text-snow/70 uppercase truncate">{label}</span>
        {!first && !done && <MatchStatus m={m} />}
      </div>
      <div className={`bg-ink-2 rounded-tile overflow-hidden ${m.is_live ? "ring-2 ring-inset ring-coral" : "ring-1 ring-inset ring-snow/12"}`}>
        {team(m.team_a_id, names.a, m.team_a_games, true)}
        {team(m.team_b_id, names.b, m.team_b_games, false)}
      </div>
    </div>
  );
}

function BracketTeam({ seed, name, score, winner, pending, first }: { seed?: Seed; name: string; score: string; winner: boolean; pending: boolean; first: boolean }) {
  const nameTone = pending ? "font-medium text-snow/65" : winner ? "font-bold text-snow" : score === "" ? "font-semibold text-snow" : "font-semibold text-snow/75";
  return (
    <div className={`h-10 box-border flex items-center gap-2 pr-3 ${winner ? "bg-win/28" : ""} ${first ? "" : "border-t border-snow/10"}`}>
      <span className="flex-none w-8.5 flex flex-col items-center leading-stat">
        {seed && (
          <>
            <span className="font-display font-bold text-caption text-snow">{seed.no}</span>
            <span className="text-3xs font-bold text-snow/65">{seed.code}</span>
          </>
        )}
      </span>
      <span className={`flex-1 min-w-0 text-sm truncate ${nameTone}`}>{name}</span>
      <span className={`font-display font-bold text-input min-w-3.5 text-right ${winner ? "text-snow" : "text-snow/75"}`}>{score}</span>
    </div>
  );
}
