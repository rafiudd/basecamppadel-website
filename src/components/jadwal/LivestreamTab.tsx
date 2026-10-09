"use client";

import { useState } from "react";
import type { EventItem } from "@/lib/events";
import { extractYouTubeVideoId, getYouTubeEmbedUrl } from "@/lib/youtube";

export function LivestreamTab({ event }: { event: EventItem }) {
  const courts = event.courtStreams ?? [];
  const [activeId, setActiveId] = useState(courts[0]?.courtId);

  if (courts.length === 0) {
    return (
      <div className="bg-white border border-ink/8 rounded-2xl p-6 text-center text-ink/60 text-sm shadow-xs">
        Belum ada livestream untuk event ini.
      </div>
    );
  }

  const active = courts.find((c) => c.courtId === activeId) ?? courts[0];
  const videoId = extractYouTubeVideoId(active.url);

  return (
    <div className="flex flex-col gap-4">
      {courts.length > 1 && (
        <div className="flex gap-1.5 items-center overflow-x-auto pb-1 scrollbar-none">
          {courts.map((c) => {
            const isActive = c.courtId === active.courtId;
            return (
              <button
                key={c.courtId}
                type="button"
                onClick={() => setActiveId(c.courtId)}
                className={`flex-none rounded-full min-h-[40px] px-4 font-sans font-bold text-sm transition-colors border-0 cursor-pointer whitespace-nowrap ${
                  isActive ? "bg-indigo text-snow" : "bg-ink/6 text-ink hover:bg-ink/10"
                }`}
              >
                {c.courtName}
              </button>
            );
          })}
        </div>
      )}

      <div className="bg-white border border-ink/8 rounded-2xl overflow-hidden shadow-xs">
        <div className="relative w-full aspect-video bg-black">
          {videoId ? (
            <iframe
              key={videoId}
              src={getYouTubeEmbedUrl(videoId)}
              title={`Livestream ${active.courtName}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-snow/70 text-sm p-6 text-center">
              Link stream ini tidak bisa di-embed.
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 px-6 py-4">
          <span className="font-bold text-[15px] text-ink">{active.courtName}</span>
          <a
            href={active.url}
            target="_blank"
            rel="noopener"
            className="text-sm font-bold text-indigo no-underline hover:underline"
          >
            Buka di YouTube →
          </a>
        </div>
      </div>
    </div>
  );
}
