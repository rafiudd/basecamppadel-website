"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PlayerHeroCard, PlayerCompactRow } from "@/components/RankRow";
import type { LeaderboardData, Player } from "@/lib/leaderboard";

export function LeaderboardClient({ initialData }: { initialData: LeaderboardData }) {
  const [tab, setTab] = useState<"men" | "women">("men");
  const [search, setSearch] = useState("");

  const menHero = initialData.men.hero;
  const menOther = initialData.men.others;
  const womenHero = initialData.women.hero;
  const womenOther = initialData.women.others;

  const filterPlayer = (p: Player) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.region && p.region.toLowerCase().includes(q)) ||
      (p.level && p.level.toLowerCase().includes(q))
    );
  };

  const filteredMenHero = menHero.filter(filterPlayer);
  const filteredMenOther = menOther.filter(filterPlayer);
  const filteredWomenHero = womenHero.filter(filterPlayer);
  const filteredWomenOther = womenOther.filter(filterPlayer);

  const totalMenCount = menHero.length + menOther.length;
  const totalWomenCount = womenHero.length + womenOther.length;

  const searchBox = (
    <div className="relative w-full md:w-[340px] flex-none">
      <div className="absolute left-3 top-3 text-snow/70 pointer-events-none">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
      </div>
      <input
        type="text"
        aria-label="Cari pemain"
        placeholder="Cari pemain"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="bg-snow/10 border-0 rounded-lg py-2.5 px-3 pl-10 text-[15px] text-snow placeholder:text-snow/50 w-full box-border outline-none min-h-[44px] focus:ring-2 focus:ring-volt/50 transition-all"
      />
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow="RANKING"
        title="Leaderboard Basecamp"
        subtitle="Poin dihitung dari hasil match di sesi Basecamp dan diperbarui setiap match selesai."
        rightElement={searchBox}
      />

      <section className="bg-snow px-6 md:px-12 py-8 md:py-16">
        <div className="w-full max-w-[1440px] mx-auto">
          {/* Mobile Tab Pill Switcher (hidden on desktop) */}
          <div className="lg:hidden flex gap-1 p-1 rounded-full bg-ink/6 mb-6">
            <button
              type="button"
              onClick={() => setTab("men")}
              className={`flex-1 py-2.5 rounded-full font-sans font-bold text-sm transition-colors border-0 cursor-pointer ${
                tab === "men" ? "bg-indigo text-snow" : "bg-transparent text-ink/70"
              }`}
            >
              Men ({totalMenCount})
            </button>
            <button
              type="button"
              onClick={() => setTab("women")}
              className={`flex-1 py-2.5 rounded-full font-sans font-bold text-sm transition-colors border-0 cursor-pointer ${
                tab === "women" ? "bg-indigo text-snow" : "bg-transparent text-ink/70"
              }`}
            >
              Women ({totalWomenCount})
            </button>
          </div>

          {/* Dual Columns on Desktop (lg:grid-cols-2) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* MEN COLUMN */}
            <div className={`flex flex-col min-w-0 ${tab === "women" ? "hidden lg:flex" : "flex"}`}>
              <div className="bg-indigo text-snow text-center font-display font-bold text-base tracking-[0.08em] rounded-[10px] py-3 mb-6">
                MEN{" "}
                <span className="font-sans font-medium text-[13px] tracking-normal opacity-80">
                  · {totalMenCount} pemain
                </span>
              </div>

              {/* Hero Cards */}
              <div className="flex flex-col gap-6">
                {filteredMenHero.map((p) => (
                  <PlayerHeroCard key={p.id} player={p} gender="men" />
                ))}
              </div>

              {/* Compact table for others */}
              {filteredMenOther.length > 0 && (
                <div className="bg-white border border-ink/8 rounded-2xl p-5 md:p-6 mt-6 shadow-xs flex flex-col">
                  {filteredMenOther.map((p, idx) => (
                    <PlayerCompactRow
                      key={p.id}
                      player={p}
                      isFirst={idx === 0}
                      gender="men"
                    />
                  ))}
                </div>
              )}

              {totalMenCount === 0 && (
                <div className="text-center py-10 text-ink/50 text-sm">
                  Belum ada data pemain pria.
                </div>
              )}
            </div>

            {/* WOMEN COLUMN */}
            <div className={`flex flex-col min-w-0 ${tab === "men" ? "hidden lg:flex" : "flex"}`}>
              <div className="bg-coral text-ink text-center font-display font-bold text-base tracking-[0.08em] rounded-[10px] py-3 mb-6">
                WOMEN{" "}
                <span className="font-sans font-medium text-[13px] tracking-normal opacity-80">
                  · {totalWomenCount} pemain
                </span>
              </div>

              {/* Hero Cards */}
              <div className="flex flex-col gap-6">
                {filteredWomenHero.map((p) => (
                  <PlayerHeroCard key={p.id} player={p} gender="women" />
                ))}
              </div>

              {/* Compact table for other women */}
              {filteredWomenOther.length > 0 && (
                <div className="bg-white border border-ink/8 rounded-2xl p-5 md:p-6 mt-6 shadow-xs flex flex-col">
                  {filteredWomenOther.map((p, idx) => (
                    <PlayerCompactRow
                      key={p.id}
                      player={p}
                      isFirst={idx === 0}
                      gender="women"
                    />
                  ))}
                </div>
              )}

              {totalWomenCount === 0 && (
                <div className="text-center py-10 text-ink/50 text-sm">
                  Belum ada data pemain wanita.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
