"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import { Badge } from "@/components/ui/Badge";
import { saveMabarScore } from "@/app/admin/events/mabar-actions";
import { goLive } from "@/app/admin/events/match-actions";
import { isScored } from "@/lib/mabar";
import type { GenMatch, Match } from "@/lib/database.types";

/**
 * One court of a round. Scores can be typed here (games per pair, ties allowed) or kept live with
 * Skor Cepat on its `matches` row; while the court is being played live the inputs are locked.
 */
export function CourtScoreCard({
  eventId,
  m,
  live,
  court,
  teamA,
  teamB,
  locked,
}: {
  eventId: string;
  m: GenMatch;
  live: Match | undefined;
  court: string;
  teamA: string;
  teamB: string;
  locked: boolean;
}) {
  const [a, setA] = useState(m.team_a_points?.toString() ?? "");
  const [b, setB] = useState(m.team_b_points?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inPlay = !!live && !isScored(m) && (live.is_live || live.status === "live" || live.team_a_games + live.team_b_games > 0);

  const save = () => {
    if (a === "" || b === "") return;
    if (Number(a) === m.team_a_points && Number(b) === m.team_b_points) return;
    start(async () => setError((await saveMabarScore(eventId, m.id, Number(a), Number(b)))?.error ?? null));
  };

  return (
    <div className={`bg-ink-2 rounded-card px-4.5 py-4 flex flex-col gap-2.5 ${live?.is_live ? "ring-2 ring-inset ring-coral" : ""} ${pending ? "opacity-80" : ""}`}>
      <div className="flex items-center justify-between gap-2 min-h-9">
        <div className="text-xs font-bold tracking-caps text-snow/70">{court}</div>
        <CourtStatus eventId={eventId} m={m} live={live} locked={locked} />
      </div>
      <ScoreLine name={teamA} value={inPlay ? String(live!.team_a_games) : a} onChange={setA} onBlur={save} locked={locked || inPlay} />
      <ScoreLine name={teamB} value={inPlay ? String(live!.team_b_games) : b} onChange={setB} onBlur={save} locked={locked || inPlay} />
      {inPlay && <div className="text-xs text-snow/60">Sedang dimainkan, skor diisi lewat Skor Cepat.</div>}
      {error && <div role="alert" className="text-xs text-coral-soft">{error}</div>}
    </div>
  );
}

function CourtStatus({ eventId, m, live, locked }: { eventId: string; m: GenMatch; live: Match | undefined; locked: boolean }) {
  if (isScored(m)) return <Badge tone="win">Selesai</Badge>;
  if (!live || locked) return null;
  if (live.is_live) {
    return (
      <span className="flex items-center gap-2">
        <Badge tone="coral">● ON AIR</Badge>
        <Link href={`/admin/live/quick?match=${live.id}`} className="text-caption font-semibold text-volt no-underline">Skor Cepat</Link>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <Link href={`/admin/live/quick?match=${live.id}`} className="btn bg-transparent text-snow/85 no-underline min-h-9 px-2.5 py-1.5 text-caption">Skor Cepat</Link>
      <ActionForm action={goLive}>
        <input type="hidden" name="event_id" value={eventId} />
        <input type="hidden" name="match_id" value={live.id} />
        <button type="submit" className="btn min-h-9 px-3.5 py-2 text-caption tracking-button">Live-kan</button>
      </ActionForm>
    </span>
  );
}

function ScoreLine({ name, value, onChange, onBlur, locked }: { name: string; value: string; onChange: (v: string) => void; onBlur: () => void; locked: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="font-display font-bold text-input">{name}</div>
      <input
        aria-label={`Skor ${name}`}
        inputMode="numeric"
        value={value}
        disabled={locked}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 3))}
        onBlur={onBlur}
        className="w-16 min-h-11 box-border border-none rounded-lg bg-snow/10 text-snow text-center font-display font-bold text-xl outline-none focus:ring-2 focus:ring-inset focus:ring-volt disabled:opacity-70"
      />
    </div>
  );
}
