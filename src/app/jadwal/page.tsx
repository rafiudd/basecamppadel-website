"use client";

import { useState, useEffect } from "react";
import { PublicShell } from "@/components/PublicShell";
import { EventCard } from "@/components/jadwal/EventCard";
import { getEvents, type EventItem } from "@/lib/events";

type Filter = "all" | "mabar" | "kompetisi";

export default function JadwalPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    getEvents().then((data) => setEvents(data));
  }, []);

  const filterItem = (e: EventItem) => {
    if (filter === "all") return true;
    return e.type === filter;
  };

  const upcomingEvents = events.filter((e) => e.status === "live" || e.status === "open");
  const pastEvents = events.filter((e) => e.status === "finished");

  const upcomingFiltered = upcomingEvents.filter(filterItem);
  const pastFiltered = pastEvents.filter(filterItem);

  const mabarCount = events.filter((e) => e.type === "mabar").length;
  const kompCount = events.filter((e) => e.type === "kompetisi").length;

  return (
    <PublicShell>
      {/* Header section with consistent padding and max-w-[1440px] */}
      <section className="bg-indigo px-6 md:px-12 py-12 md:py-14 text-snow">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-2.5">
          <div className="font-sans font-bold text-sm tracking-[0.1em] text-[#FFD43B] uppercase">
            Jadwal
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-[38px] leading-[1.15] m-0 text-snow">
            Mabar &amp; Kompetisi
          </h1>
          <p className="font-sans text-base text-snow/75 leading-relaxed m-0 max-w-[560px]">
            Pilih event, cek detailnya, lalu daftar lewat WhatsApp. Terbuka buat semua level.
          </p>
        </div>
      </section>

      {/* Main Content section with consistent padding and max-w-[1440px] */}
      <section className="px-6 md:px-12 py-8 md:pt-12 md:pb-[72px] bg-snow">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-8">
          {/* Filter Pills */}
          <div className="flex gap-2 flex-wrap items-center">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-full min-h-[44px] px-5 font-sans font-bold text-sm transition-colors cursor-pointer border-0 whitespace-nowrap ${
                filter === "all"
                  ? "bg-indigo text-snow"
                  : "bg-ink/6 text-ink hover:bg-ink/10"
              }`}
            >
              Semua <span className="font-normal opacity-70">{events.length || 5}</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter("mabar")}
              className={`rounded-full min-h-[44px] px-5 font-sans font-bold text-sm transition-colors cursor-pointer border-0 whitespace-nowrap ${
                filter === "mabar"
                  ? "bg-indigo text-snow"
                  : "bg-ink/6 text-ink hover:bg-ink/10"
              }`}
            >
              Mabar <span className="font-normal opacity-70">{mabarCount || 2}</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter("kompetisi")}
              className={`rounded-full min-h-[44px] px-5 font-sans font-bold text-sm transition-colors cursor-pointer border-0 whitespace-nowrap ${
                filter === "kompetisi"
                  ? "bg-indigo text-snow"
                  : "bg-ink/6 text-ink hover:bg-ink/10"
              }`}
            >
              Kompetisi <span className="font-normal opacity-70">{kompCount || 3}</span>
            </button>
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
        </div>
      </section>
    </PublicShell>
  );
}
