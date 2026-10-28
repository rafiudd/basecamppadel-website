"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatRupiah, PIN_COLORS, CATEGORY_LABELS } from "@/lib/kelasRules";

export function ClassCatalogClient({ initialClasses }: { initialClasses: any[] }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [pin, setPin] = useState("all");
  const [sort, setSort] = useState("pop");

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

  const resetFilter = () => {
    setQ("");
    setCategory("all");
    setPin("all");
    setSort("pop");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Filter Controls Card */}
      <div className="bg-white border border-ink/10 rounded-2xl p-4 md:p-5 grid grid-cols-1 md:grid-cols-12 gap-3 items-end shadow-sm">
        <div className="md:col-span-5 flex flex-col gap-1.5">
          <span className="text-[11px] font-bold tracking-wider uppercase text-ink/55">
            Cari kelas
          </span>
          <div className="relative">
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
        </div>

        <div className="md:col-span-2 flex flex-col gap-1.5">
          <span className="text-[11px] font-bold tracking-wider uppercase text-ink/55">
            Kategori
          </span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-white border border-ink/20 rounded-xl px-3.5 py-3 text-sm font-semibold text-ink outline-none cursor-pointer"
          >
            <option value="all">Semua kategori</option>
            <option value="dasar">Dasar</option>
            <option value="teknik">Teknik</option>
            <option value="taktik">Posisi & taktik</option>
            <option value="mf">Mental & fisik</option>
            <option value="khusus">Program khusus</option>
          </select>
        </div>

        <div className="md:col-span-2 flex flex-col gap-1.5">
          <span className="text-[11px] font-bold tracking-wider uppercase text-ink/55">
            Warna pin
          </span>
          <select
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full bg-white border border-ink/20 rounded-xl px-3.5 py-3 text-sm font-semibold text-ink outline-none cursor-pointer"
          >
            <option value="all">Semua pin</option>
            <option value="Putih">Pin Putih</option>
            <option value="Kuning">Pin Kuning</option>
            <option value="Biru">Pin Biru</option>
            <option value="Merah">Pin Merah</option>
            <option value="Hitam">Pin Hitam</option>
          </select>
        </div>

        <div className="md:col-span-3 flex flex-col gap-1.5">
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
      </div>

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
