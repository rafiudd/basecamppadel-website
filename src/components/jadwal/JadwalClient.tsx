"use client";

import { useState, useRef } from "react";
import { EventCard } from "@/components/jadwal/EventCard";
import type { EventItem } from "@/lib/events";

type Filter = "all" | "mabar" | "kompetisi";

export function JadwalClient({ initialEvents }: { initialEvents: EventItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const events = initialEvents;

  const filterItem = (e: EventItem) => {
    if (filter === "all") return true;
    return e.type === filter;
  };

  const handleFilterChange = (newFilter: Filter) => {
    setFilter(newFilter);
    if (tabsContainerRef.current) {
      const rect = tabsContainerRef.current.getBoundingClientRect();
      const topOffset = window.innerWidth >= 768 ? 88 : 56;
      if (rect.top < topOffset) {
        tabsContainerRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const upcomingEvents = events.filter((e) => e.status === "live" || e.status === "open");
  const pastEvents = events.filter((e) => e.status === "finished");

  const upcomingFiltered = upcomingEvents.filter(filterItem);
  const pastFiltered = pastEvents.filter(filterItem);

  const mabarCount = events.filter((e) => e.type === "mabar").length;
  const kompCount = events.filter((e) => e.type === "kompetisi").length;

  return (
    <section className="px-6 md:px-12 pt-6 md:pt-8 pb-[72px] bg-snow">
      <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-6 md:gap-8">
        {/* Sticky Filter Bar: Seamless sticky background matching event detail */}
        <div
          ref={tabsContainerRef}
          className="sticky top-[calc(56px+env(safe-area-inset-top,0px))] md:top-[88px] z-20 -mx-6 px-6 md:-mx-12 md:px-12 py-2.5 bg-snow/95 backdrop-blur-md"
        >
          <div className="w-full max-w-[1440px] mx-auto">
            <div className="flex gap-2 items-center overflow-x-auto py-1 scrollbar-none">
              <button
                type="button"
                onClick={() => handleFilterChange("all")}
                className={`flex-none rounded-full min-h-[42px] px-5 font-sans font-bold text-sm transition-all border-0 cursor-pointer select-none whitespace-nowrap active:scale-95 ${
                  filter === "all"
                    ? "bg-indigo text-snow shadow-xs"
                    : "bg-ink/6 text-ink/75 hover:bg-ink/10 hover:text-ink"
                }`}
              >
                Semua <span className="font-normal opacity-70">{events.length}</span>
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange("mabar")}
                className={`flex-none rounded-full min-h-[42px] px-5 font-sans font-bold text-sm transition-all border-0 cursor-pointer select-none whitespace-nowrap active:scale-95 ${
                  filter === "mabar"
                    ? "bg-indigo text-snow shadow-xs"
                    : "bg-ink/6 text-ink/75 hover:bg-ink/10 hover:text-ink"
                }`}
              >
                Mabar <span className="font-normal opacity-70">{mabarCount}</span>
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange("kompetisi")}
                className={`flex-none rounded-full min-h-[42px] px-5 font-sans font-bold text-sm transition-all border-0 cursor-pointer select-none whitespace-nowrap active:scale-95 ${
                  filter === "kompetisi"
                    ? "bg-indigo text-snow shadow-xs"
                    : "bg-ink/6 text-ink/75 hover:bg-ink/10 hover:text-ink"
                }`}
              >
                Kompetisi <span className="font-normal opacity-70">{kompCount}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section: Akan Datang */}
        {upcomingFiltered.length > 0 && (
          <div className="flex flex-col gap-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display font-bold text-2xl md:text-[26px] text-ink m-0">
                Akan datang
              </h2>
              <span className="text-sm text-ink/65">{upcomingFiltered.length} event</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {upcomingFiltered.map((ev) => (
                <EventCard key={ev.id} event={ev} />
              ))}
            </div>
          </div>
        )}

        {/* Section: Sudah Lewat */}
        {pastFiltered.length > 0 && (
          <div className="flex flex-col gap-5 pt-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display font-bold text-2xl md:text-[26px] text-ink m-0">
                Sudah lewat
              </h2>
              <span className="text-sm text-ink/65">{pastFiltered.length} event</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {pastFiltered.map((ev) => (
                <EventCard key={ev.id} event={ev} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state if no events for current filter */}
        {upcomingFiltered.length === 0 && pastFiltered.length === 0 && (
          <div className="bg-white border border-ink/8 rounded-2xl p-10 text-center text-ink flex flex-col items-center gap-2 shadow-xs">
            <div className="font-display font-bold text-lg">Belum ada event di kategori ini</div>
            <p className="text-sm text-ink/65 m-0 max-w-sm">
              Event baru akan segera dijadwalkan. Cek kategori lain atau pantau kembali nanti.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
