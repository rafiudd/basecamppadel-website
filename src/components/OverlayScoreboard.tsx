"use client";

import type { Match } from "@/lib/database.types";
import { useLiveMatch, useTick } from "@/lib/useLiveMatch";
import { formatTimer, matchElapsedSeconds } from "@/lib/format";
import { MountainMark } from "./Logo";

function TeamRow({ name, sets, game, serving }: { name: string; sets: number[]; game: string; serving: boolean }) {
  return (
    <div
      className="flex items-center gap-[18px] pl-[14px] -ml-[18px] border-l-4"
      style={{ borderColor: serving ? "#FFD43B" : "transparent" }}
    >
      <div
        className="w-[18px] h-[18px] rounded-full flex-none"
        style={{ background: serving ? "#FFD43B" : "transparent", boxShadow: serving ? "0 0 0 4px rgba(255,212,59,0.25)" : "none" }}
      />
      <div className="font-display font-bold text-[30px] uppercase text-snow flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">
        {name}
      </div>
      <div className="flex gap-2">
        {[sets[0] ?? 0, sets[1] ?? 0].map((s, i) => (
          <div key={i} className="w-[46px] h-[46px] rounded-lg bg-snow/10 flex items-center justify-center font-display font-bold text-[24px] text-snow">
            {s}
          </div>
        ))}
      </div>
      <div
        className="w-16 h-16 rounded-[10px] flex items-center justify-center font-display font-bold text-[32px]"
        style={{ background: serving ? "#FFD43B" : "rgba(251,247,241,0.1)", color: serving ? "#1B1650" : "#FBF7F1" }}
      >
        {game}
      </div>
    </div>
  );
}

export function OverlayScoreboard({ initial, matchId, showBackdrop }: { initial: Match | null; matchId?: string; showBackdrop: boolean }) {
  const match = useLiveMatch(initial, matchId);
  useTick(!!match?.timer_running);

  const live = !!match?.is_live;
  const timer = match ? formatTimer(matchElapsedSeconds(match)) : "00:00";

  return (
    <div
      className="relative w-[1920px] h-[1080px] overflow-hidden font-sans text-snow"
      style={{ background: showBackdrop ? "#17151F" : "transparent" }}
    >
      {/* bottom gradient scrim */}
      <div
        className="absolute left-0 right-0 bottom-0 h-[340px] pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(23,21,31,0) 0%, rgba(27,22,80,0.75) 55%, rgba(27,22,80,0.95) 100%)" }}
      />

      {/* LIVE / OFF AIR badge */}
      <div className="absolute top-10 left-10 flex items-center gap-2.5 bg-ink/55 px-[22px] py-3 rounded-full backdrop-blur-[6px]">
        {live ? (
          <>
            <div className="w-3 h-3 rounded-full bg-coral animate-livepulse" />
            <span className="font-display font-bold text-[22px] tracking-[0.06em] text-snow">LIVE</span>
          </>
        ) : (
          <>
            <div className="w-3 h-3 rounded-full bg-muted" />
            <span className="font-display font-bold text-[22px] tracking-[0.06em] text-muted">OFF AIR</span>
          </>
        )}
      </div>

      {/* match clock */}
      <div className="absolute top-10 right-10 flex items-center gap-3.5 bg-ink/55 px-6 py-3 rounded-full backdrop-blur-[6px]">
        <span className="font-display font-bold text-[24px] text-volt tracking-[0.02em] tabular-nums">{timer}</span>
      </div>

      {/* lower third */}
      <div className="absolute left-0 right-0 bottom-0 h-[190px] bg-indigo border-t-4 border-volt flex items-stretch">
        <div className="flex-none w-[260px] flex items-center gap-4 px-8 border-r border-snow/15">
          <MountainMark size={40} />
          <div className="font-display font-bold leading-[1.15]">
            <div className="text-[20px] text-snow">BASECAMP</div>
            <div className="text-[20px] text-coral">PADEL</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-2.5 px-10 min-w-0">
          <TeamRow name={match?.team_a_name ?? "Team A"} sets={match?.team_a_sets ?? [0, 0]} game={match?.team_a_game ?? "0"} serving={match?.serve === "A"} />
          <TeamRow name={match?.team_b_name ?? "Team B"} sets={match?.team_b_sets ?? [0, 0]} game={match?.team_b_game ?? "0"} serving={match?.serve === "B"} />
        </div>

        <div className="flex-none w-[320px] border-l border-snow/15 px-8 flex flex-col justify-center gap-1.5">
          <div className="font-sans font-bold text-[15px] tracking-[0.08em] text-coral uppercase">{match?.session_label ?? "—"}</div>
          <div className="font-display font-bold text-[22px] text-snow">{match?.venue ?? ""}</div>
          <div className="font-sans font-semibold text-base text-snow/65">{match?.set_label ?? ""}</div>
        </div>
      </div>
    </div>
  );
}
