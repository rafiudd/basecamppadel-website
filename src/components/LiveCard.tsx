"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { Match, Serve } from "@/lib/database.types";
import { usePolledLiveMatches } from "@/lib/useLiveMatch";
import { formatClockTime } from "@/lib/format";
import { YOUTUBE_URL } from "@/lib/config";

function Row({
  name,
  sets,
  game,
  serving,
}: {
  name: string;
  sets: number[];
  game: string | number;
  serving: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 pl-2.5 transition-colors border-l-[3px] ${
        serving ? "border-volt" : "border-transparent"
      }`}
    >
      <div
        className="w-3 h-3 rounded-full flex-none transition-all"
        style={{
          background: serving ? "#FFD43B" : "transparent",
          boxShadow: serving ? "0 0 0 3px rgba(255,212,59,0.25)" : "none",
        }}
      />
      <div className="font-display font-bold text-[18px] uppercase flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis text-snow">
        {name}
      </div>
      <div className="flex gap-1.5">
        {[sets[0] ?? 0, sets[1] ?? 0].map((s, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-md bg-snow/10 flex items-center justify-center font-display font-bold text-[15px] text-snow"
          >
            {s}
          </div>
        ))}
      </div>
      <div
        className="w-11 h-11 rounded-lg flex items-center justify-center font-display font-bold text-[20px] transition-colors"
        style={{
          background: serving ? "#FFD43B" : "rgba(251,247,241,0.1)",
          color: serving ? "#1B1650" : "#FBF7F1",
        }}
      >
        {game}
      </div>
    </div>
  );
}

const DEFAULT_PREVIEW = "/images/live-stream.jpg";

function extractYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  return match ? match[1] : null;
}

function getYouTubeThumbnail(videoId: string | null): string {
  if (!videoId) return DEFAULT_PREVIEW;
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/** "Live Sekarang" on Home. With several matches ON AIR, pills above the card pick which one to show. */
export function LiveCard({ initial }: { initial?: Match[] }) {
  const polled = usePolledLiveMatches(initial ?? []);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = polled.find((m) => m.id === pickedId) ?? polled[0] ?? null;

  // Use real data if live, otherwise use mock design match so UI matches the prototype
  const match = picked ? picked : {
    is_live: true,
    stream_url: YOUTUBE_URL,
    serve: "A" as Serve,
    team_a_name: "Rayhan / Andra",
    team_b_name: "Pao Pao / Temmy",
    team_a_sets: [0, 0],
    team_b_sets: [0, 0],
    team_a_game: "0",
    team_b_game: "0",
    session_label: "Basecamp Battle Oktober #1",
    venue: "East Padel House",
    starts_at: "2026-10-30T11:00:00Z",
  };

  const serve: Serve = match.serve;
  const href = match.stream_url || YOUTUBE_URL;

  const [isPlaying, setIsPlaying] = useState(false);
  const [imgError, setImgError] = useState(false);

  const videoId = extractYouTubeVideoId(match.stream_url);
  const thumbSrc = !imgError && videoId ? getYouTubeThumbnail(videoId) : DEFAULT_PREVIEW;

  useEffect(() => {
    setIsPlaying(false);
    setImgError(false);
  }, [picked?.id]);

  const handlePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoId) {
      setIsPlaying(true);
    } else if (match.stream_url) {
      window.open(match.stream_url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <section className="bg-snow px-6 md:px-12 py-10 md:py-14 w-full">
      <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-3">
        {polled.length > 1 && (
          <div role="tablist" aria-label="Match yang sedang live" className="flex gap-2 overflow-x-auto pb-1">
            {polled.map((m) => {
              const active = m.id === picked?.id;
              const label =
                m.team_a_name?.trim() || m.team_b_name?.trim()
                  ? `${m.team_a_name?.trim() || "Tim A"} vs ${m.team_b_name?.trim() || "Tim B"}`
                  : m.session_label || "Match Live";
              return (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPickedId(m.id)}
                  className={`flex-none flex items-center gap-2 rounded-full px-4 py-2.5 min-h-11 border-none font-sans font-bold text-[13px] whitespace-nowrap cursor-pointer transition-colors ${
                    active ? "bg-indigo text-snow" : "bg-ink/8 text-ink hover:bg-ink/12"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-coral animate-livepulse" />
                  {label}
                </button>
              );
            })}
          </div>
        )}

        <article className="bg-indigo rounded-[20px] overflow-hidden text-snow shadow-xl">
          {/* Video or Thumbnail banner */}
          <div className="relative w-full h-[240px] sm:h-[360px] md:h-[475px] overflow-hidden bg-ink-2">
            {isPlaying && videoId ? (
              <div className="relative w-full h-full bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0`}
                  title={`Live Stream - ${match.team_a_name || "Tim A"} vs ${match.team_b_name || "Tim B"}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
                <button
                  type="button"
                  onClick={() => setIsPlaying(false)}
                  className="absolute top-4 right-4 bg-ink/80 hover:bg-ink text-snow text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-xs transition-colors z-10 border border-snow/20 cursor-pointer"
                  title="Tutup player video"
                >
                  ✕ Tutup Video
                </button>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={handlePlay}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handlePlay();
                  }
                }}
                className="relative w-full h-full group cursor-pointer"
                aria-label="Putar live stream"
              >
                <Image
                  src={thumbSrc}
                  alt="Live stream thumbnail"
                  fill
                  sizes="(max-width: 1440px) 100vw, 1440px"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  priority
                  unoptimized
                  onError={() => setImgError(true)}
                />

                {/* Centered play button circle */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[72px] h-[72px] rounded-full bg-ink/55 flex items-center justify-center backdrop-blur-xs transition-transform group-hover:scale-110 shadow-lg">
                    <div
                      className="w-0 h-0 ml-1.5"
                      style={{
                        borderStyle: "solid",
                        borderWidth: "14px 0 14px 22px",
                        borderColor: "transparent transparent transparent #FBF7F1",
                      }}
                    />
                  </div>
                </div>

                {/* Live badge */}
                <div className="absolute top-4 left-4 sm:top-5 sm:left-5 flex items-center gap-2.5 bg-ink/75 border border-coral/60 rounded-full px-4 py-2 pointer-events-none">
                  <div className="w-2.5 h-2.5 rounded-full bg-coral animate-livepulse" />
                  <div className="font-sans font-bold text-[13px] tracking-[0.08em] text-coral uppercase">
                    Live Sekarang
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Scoreboard bottom strip */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-6 md:px-8 py-6">
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              {/* Set & Game Headers */}
              <div className="flex items-center gap-3 pl-3 text-[11px] font-bold tracking-[0.08em] text-snow/60 uppercase">
                <div className="flex-1">Set 1</div>
                <div className="flex gap-1.5">
                  <div className="w-8 text-center">S1</div>
                  <div className="w-8 text-center">S2</div>
                </div>
                <div className="w-11 text-center">Game</div>
              </div>

              <Row
                name={match.team_a_name}
                sets={match.team_a_sets}
                game={match.team_a_game}
                serving={serve === "A"}
              />
              <Row
                name={match.team_b_name}
                sets={match.team_b_sets}
                game={match.team_b_game}
                serving={serve === "B"}
              />

              <div className="font-sans text-[13px] text-snow/65 pl-3 pt-1">
                {match.session_label} · {match.venue}
                {match.starts_at && ` · Mulai ${formatClockTime(match.starts_at)} WIB`}
              </div>
            </div>

            <div className="flex-none self-start lg:self-center flex items-center gap-3">
              {!isPlaying ? (
                <button
                  type="button"
                  onClick={() => handlePlay()}
                  className="bg-coral text-ink rounded-full px-7 py-3.5 font-sans font-bold text-sm text-center transition-transform hover:scale-105 active:scale-95 border-none cursor-pointer"
                >
                  Tonton Live
                </button>
              ) : (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-coral text-ink rounded-full px-7 py-3.5 font-sans font-bold text-sm text-center transition-transform hover:scale-105 active:scale-95 no-underline inline-block"
                >
                  Buka di YouTube ↗
                </a>
              )}
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}


