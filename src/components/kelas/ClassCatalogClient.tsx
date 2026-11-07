"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatRupiah, PIN_COLORS, CATEGORY_LABELS, ALL_PINS } from "@/lib/kelasRules";

/** A filter choice: a swatch dot for pins, plain text for categories. */
function FilterPill({
  active,
  onClick,
  swatch,
  children,
}: {
  active: boolean;
  onClick: () => void;
  swatch?: { bg: string; border: string };
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-none inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold whitespace-nowrap border transition-colors ${
        active ? "bg-ink text-snow border-ink" : "bg-white text-ink/70 border-ink/15 hover:border-ink/40 hover:text-ink"
      }`}
    >
      {swatch && (
        <span className="w-2.5 h-2.5 rounded-full inline-block flex-none" style={{ background: swatch.bg, border: swatch.border }} />
      )}
      {children}
    </button>
  );
}

/** An active filter, removable with the × — lets a visitor see and undo one filter without resetting all. */
function ActiveFilterChip({ onRemove, children }: { onRemove: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1.5 rounded-full bg-coral/12 text-[#B8321A] text-xs font-bold pl-3 pr-2 py-1.5 whitespace-nowrap"
    >
      {children}
      <span aria-hidden className="text-[13px] leading-none">×</span>
    </button>
  );
}

export function ClassCatalogClient({ initialClasses }: { initialClasses: any[] }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [pin, setPin] = useState("all");
  const [sort, setSort] = useState("pop");
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const result = initialClasses.filter((k) => {
      if (category !== "all" && k.category !== category) return false;
      if (pin !== "all" && (!k.suitablePins || !k.suitablePins.includes(pin))) return false;
      if (query) {
        const text = `${k.title} ${k.description}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });

    return result.sort((a, b) => {
      switch (sort) {
        case "rate":
          return b.averageRating - a.averageRating || b.totalReviews - a.totalReviews;
        case "cheap":
          return a.price - b.price;
        case "exp":
          return b.price - a.price;
        case "new":
          if (b.isNew !== a.isNew) return b.isNew ? 1 : -1;
          return a.sortOrder - b.sortOrder;
        case "pop":
        default:
          return b.totalParticipants - a.totalParticipants || a.sortOrder - b.sortOrder;
      }
    });
  }, [initialClasses, q, category, pin, sort]);

  const hasFilter = q.trim() !== "" || category !== "all" || pin !== "all";
  const activeFilterCount = (category !== "all" ? 1 : 0) + (pin !== "all" ? 1 : 0) + (sort !== "pop" ? 1 : 0);

  const resetFilter = () => {
    setQ("");
    setCategory("all");
    setPin("all");
    setSort("pop");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Filter Controls Card */}
      <div className="bg-white border border-ink/10 rounded-2xl p-4 md:p-5 flex flex-col gap-4 shadow-sm">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <svg
              className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>
            <input
              type="search"
              placeholder="Mis. backglass, volley, private"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full bg-white border border-ink/20 rounded-xl px-3.5 py-3 pl-10 text-sm text-ink outline-none focus:border-ink transition-colors"
            />
          </div>

          {/* Toggle for the rest of the controls, collapsed by default on every screen size */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex-none inline-flex items-center gap-1.5 rounded-xl border border-ink/20 px-3.5 text-sm font-bold text-ink hover:border-ink/40"
          >
            Filter
            {activeFilterCount > 0 && (
              <span className="w-4.5 h-4.5 rounded-full bg-coral text-ink text-[10px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
            <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        <div className={`${expanded ? "flex" : "hidden"} flex-col gap-4`}>
          <div className="md:w-56 flex flex-col gap-1.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-ink/55">
              Urutkan
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full bg-white border border-ink/20 rounded-xl px-3.5 py-3 text-sm font-semibold text-ink outline-none cursor-pointer"
            >
              <option value="pop">Paling populer</option>
              <option value="rate">Rating tertinggi</option>
              <option value="cheap">Harga terendah</option>
              <option value="exp">Harga tertinggi</option>
              <option value="new">Terbaru</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-ink/55">
              Kategori
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [&::-webkit-scrollbar]:hidden">
              <FilterPill active={category === "all"} onClick={() => setCategory("all")}>Semua kategori</FilterPill>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <FilterPill key={key} active={category === key} onClick={() => setCategory(key)}>
                  {label}
                </FilterPill>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-ink/55">
              Warna pin
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [&::-webkit-scrollbar]:hidden">
              <FilterPill active={pin === "all"} onClick={() => setPin("all")}>Semua pin</FilterPill>
              {ALL_PINS.map((p) => (
                <FilterPill key={p} active={pin === p} onClick={() => setPin(p)} swatch={PIN_COLORS[p]}>
                  {p}
                </FilterPill>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Active filters, each removable on its own */}
      {hasFilter && (
        <div className="flex items-center gap-2 flex-wrap -mt-1">
          {q.trim() && <ActiveFilterChip onRemove={() => setQ("")}>"{q.trim()}"</ActiveFilterChip>}
          {category !== "all" && (
            <ActiveFilterChip onRemove={() => setCategory("all")}>{CATEGORY_LABELS[category] ?? category}</ActiveFilterChip>
          )}
          {pin !== "all" && <ActiveFilterChip onRemove={() => setPin("all")}>Pin {pin}</ActiveFilterChip>}
        </div>
      )}

      {/* Banner Journey Pin */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FFF6CC] border border-amber-200/60 rounded-2xl p-4 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1B1650] text-volt flex items-center justify-center flex-none">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 9l10-5 10 5-10 5z" />
              <path d="M6 11v5c0 1.6 2.7 3 6 3s6-1.4 6-3v-5" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-sm text-ink">Belum punya pin?</div>
            <div className="text-xs sm:text-sm text-ink/70">
              Mulai dari <b>Padel for Firstimer</b>. Coach bakal kasih pin pertamamu setelah kelas.
            </div>
          </div>
        </div>
        <Link
          href="/leaderboard"
          className="text-xs sm:text-sm font-bold text-ink hover:text-coral border border-ink/20 rounded-full px-4 py-2 no-underline whitespace-nowrap self-stretch sm:self-auto text-center"
        >
          Lihat journey pin →
        </Link>
      </div>

      {/* Counter & Reset */}
      <div className="flex justify-between items-baseline text-sm text-ink/70">
        <span>Menampilkan <b className="text-ink">{filtered.length}</b> kelas</span>
        {hasFilter && (
          <button
            type="button"
            onClick={resetFilter}
            className="text-xs font-bold text-ink underline cursor-pointer"
          >
            Reset filter
          </button>
        )}
      </div>

      {/* Class Cards Grid */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-ink/20 rounded-2xl text-ink/65 text-sm flex flex-col gap-2 items-center">
          <span>Gak ada kelas yang cocok dengan filter yang dipilih.</span>
          <button
            type="button"
            onClick={resetFilter}
            className="btn btn-coral text-xs font-bold px-4 py-2 rounded-full text-ink tracking-button mt-1"
          >
            Reset filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {filtered.map((k) => (
            <article
              key={k.id}
              className="bg-white border border-ink/10 rounded-2xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Pin Strip Bar */}
              <div className="flex h-2 border-b border-ink/5">
                {k.suitablePins.map((pinName: string) => (
                  <span
                    key={pinName}
                    style={{ background: PIN_COLORS[pinName]?.bg || "#FFF" }}
                    className="flex-1 h-full"
                  />
                ))}
              </div>

              {/* Media Thumbnail */}
              <Link href={`/kelas/${k.slug}`} className="block relative aspect-video bg-ink/10 overflow-hidden group">
                <img
                  src={k.coverImageUrl || "/images/classes/coach-drill.webp"}
                  alt={k.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent opacity-80" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="w-12 h-12 rounded-full bg-coral flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-ink ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="7,4 20,12 7,20" />
                    </svg>
                  </span>
                </div>
                <span className="absolute left-2.5 bottom-2.5 inline-flex items-center gap-1.5 bg-white/95 text-ink text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                  {k.hasVideo ? "Video preview" : "Foto kelas"}
                </span>
                <span className="absolute right-2.5 bottom-2.5 bg-ink/75 text-snow text-[11px] font-bold px-2 py-0.5 rounded">
                  {k.hasVideo ? "1:20" : "Galeri"}
                </span>
              </Link>

              {/* Content Body */}
              <div className="p-5 flex flex-col gap-3 flex-1">
                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-ink/5 font-bold text-ink">
                    <span className="flex items-center gap-1">
                      {k.suitablePins.map((pinName: string) => (
                        <span
                          key={pinName}
                          className="w-2 h-2 rounded-full inline-block"
                          style={{
                            background: PIN_COLORS[pinName]?.bg || "#FFF",
                            border: PIN_COLORS[pinName]?.border || "none",
                          }}
                        />
                      ))}
                    </span>
                    <span>Pin {k.suitablePins.join(" & ")}</span>
                  </span>
                  <span className="text-ink/60 font-medium">
                    {CATEGORY_LABELS[k.category] || k.category}
                  </span>
                  {k.isNew && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-black bg-coral text-ink">
                      BARU
                    </span>
                  )}
                </div>

                <Link href={`/kelas/${k.slug}`} className="no-underline text-ink">
                  <h3 className="font-display font-bold text-lg leading-snug m-0 hover:text-coral transition-colors">
                    {k.title}
                  </h3>
                </Link>

                <p className="text-xs text-ink/70 leading-relaxed m-0 line-clamp-2">
                  {k.description}
                </p>

                {/* Rating & Alumni stats */}
                <div className="flex items-center gap-3 text-xs text-ink/75 pt-1">
                  <span className="flex items-center gap-1 font-bold text-ink">
                    <span className="text-amber-500">★</span> {k.averageRating}
                    <span className="font-normal text-ink/50">({k.totalReviews})</span>
                  </span>
                  <span>·</span>
                  <span>
                    <b className="text-ink">{k.totalParticipants}</b> udah ikut
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-ink/70 flex-wrap">
                  <span><b>{k.totalSessions} sesi</b> · {k.durationPerSession} mnt</span>
                  <span>·</span>
                  <span>Maks {k.capacity} org</span>
                  <span>·</span>
                  <span className="font-semibold text-ink">
                    {k.coachName ? `Coach ${k.coachName}` : "Pilih coach"}
                  </span>
                </div>

                {/* Price & CTA */}
                <div className="mt-auto pt-3 border-t border-ink/10 flex items-center justify-between gap-3">
                  <span className="font-display font-bold text-base text-[#1B1650]">
                    {formatRupiah(k.price)}
                  </span>
                  <Link
                    href={`/kelas/${k.slug}`}
                    className="btn btn-coral px-4 py-2 rounded-full text-xs font-bold text-ink no-underline tracking-button whitespace-nowrap shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  >
                    Lihat & daftar
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
