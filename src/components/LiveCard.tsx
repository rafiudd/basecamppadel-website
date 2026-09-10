"use client";

import Image from "next/image";
import type { Match, Serve } from "@/lib/database.types";
import { useLiveMatch } from "@/lib/useLiveMatch";
import { YOUTUBE_URL } from "@/lib/config";

function Row({ name, sets, game, serving }: { name: string; sets: number[]; game: string; serving: boolean }) {
  return (
    <div
      className="flex items-center gap-3 pl-2.5 -ml-[13px] border-l-[3px]"
      style={{ borderColor: serving ? "#FFD43B" : "transparent" }}
    >
      <div
        className="w-3 h-3 rounded-full flex-none"
        style={{
          background: serving ? "#FFD43B" : "transparent",
          boxShadow: serving ? "0 0 0 3px rgba(255,212,59,0.25)" : "none",
        }}
      />
      <div className="font-display font-bold text-[18px] uppercase flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">
        {name}
      </div>
      <div className="flex gap-1.5">
        {[sets[0] ?? 0, sets[1] ?? 0].map((s, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-md bg-snow/10 flex items-center justify-center font-display font-bold text-[15px]"
          >
            {s}
          </div>
        ))}
      </div>
      <div
        className="w-11 h-11 rounded-lg flex items-center justify-center font-display font-bold text-[20px]"
        style={{ background: serving ? "#FFD43B" : "rgba(251,247,241,0.1)", color: serving ? "#1B1650" : "#FBF7F1" }}
      >
        {game}
      </div>
    </div>
  );
}

function thumbnailFor(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : null;
}

export function LiveCard({ initial }: { initial: Match | null }) {
  const match = useLiveMatch(initial);
  if (!match || !match.is_live) return null;

  const serve: Serve = match.serve;
  const href = match.stream_url || YOUTUBE_URL;
  const thumb = thumbnailFor(match.stream_url);

  return (
    <section className="px-6 md:px-12 py-10 md:py-14 max-w-[1200px] mx-auto w-full">
      <a
        href={href}
        target="_blank"
        rel="noopener"
        className="no-underline block bg-indigo rounded-[20px] overflow-hidden text-snow"
      >
        <div className="relative w-full aspect-video pointer-events-none bg-ink-2">
          {thumb ? (
            <Image src={thumb} alt="" fill sizes="(max-width: 1200px) 100vw, 1200px" className="object-cover" unoptimized />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#2a2460,#1B1650)]" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-ink/25">
            <div
              className="w-0 h-0"
              style={{ borderStyle: "solid", borderWidth: "22px 0 22px 34px", borderColor: "transparent transparent transparent #FBF7F1" }}
            />
          </div>
          <div className="absolute top-5 left-5 flex items-center gap-2.5 bg-ink/65 border border-coral/50 rounded-full px-[18px] py-2">
            <div className="w-2.5 h-2.5 rounded-full bg-coral animate-livepulse" />
            <div className="font-sans font-bold text-[13px] tracking-[0.08em] text-coral uppercase">Live Sekarang</div>
          </div>
        </div>

        <div className="flex items-center gap-7 flex-wrap px-6 md:px-8 py-6">
          <div className="flex-1 min-w-[260px] flex flex-col gap-2">
            <Row name={match.team_a_name} sets={match.team_a_sets} game={match.team_a_game} serving={serve === "A"} />
            <Row name={match.team_b_name} sets={match.team_b_sets} game={match.team_b_game} serving={serve === "B"} />
            <div className="font-sans text-[13px] text-snow/50">
              {match.session_label} · {match.venue}
            </div>
          </div>
          <div className="bg-coral text-snow rounded-full px-[26px] py-3.5 font-sans font-bold text-sm">Tonton Live</div>
        </div>
      </a>
    </section>
  );
}
