"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatRupiah, PIN_COLORS } from "@/lib/kelasRules";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";

const PAGE_SIZE = 20;

interface ClassRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  suitablePins: string[];
  price: number;
  totalSessions: number;
  durationPerSession: number;
  capacity: number;
  published: boolean;
  status: string;
  coachName: string | null;
  nextSchedule: string;
  slotRatio: string;
  slotPercentage: number;
  rating: string;
}

interface StatsSummary {
  activeCount: number;
  draftCount: number;
  monthlyParticipants: number;
  avgRating: number;
  totalReviews?: number;
  unansweredComments: number;
}

export function AdminClassListClient({
  initialClasses,
  stats,
}: {
  initialClasses: ClassRow[];
  stats: StatsSummary;
}) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("near");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return initialClasses.filter((c) => {
      if (category !== "all" && c.category !== category) return false;
      if (status !== "all" && c.status.toLowerCase() !== status.toLowerCase()) return false;
      if (q.trim()) {
        const query = q.toLowerCase();
        if (!c.title.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [initialClasses, q, category, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const paged = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex flex-col gap-1 max-w-xl">
          <h1 className="font-display font-bold text-2xl md:text-[26px] leading-tight m-0 text-snow">
            Kelas
          </h1>
          <p className="text-sm text-snow/70 m-0 leading-normal">
            Atur katalog kelas, jadwal, peserta, dan ulasan. Kelas aktif otomatis tampil di halaman Kelas publik.
          </p>
        </div>
        <Link
          href="/admin/kelas/new"
          className="btn btn-coral text-ink font-sans font-bold text-sm px-4.5 py-2.5 rounded-lg no-underline tracking-button whitespace-nowrap"
        >
          + Buat kelas
        </Link>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
        <div className="bg-[#221F30] rounded-2xl p-4 md:px-4.5 md:py-4 flex flex-col gap-1">
          <div className="font-display font-bold text-2xl text-snow">{stats.activeCount}</div>
          <div className="text-xs md:text-sm text-snow/70">Kelas aktif</div>
          <div className="text-xs text-snow/55 mt-0.5">{stats.draftCount} draft</div>
        </div>
        <div className="bg-[#221F30] rounded-2xl p-4 md:px-4.5 md:py-4 flex flex-col gap-1">
          <div className="font-display font-bold text-2xl text-snow">{stats.monthlyParticipants}</div>
          <div className="text-xs md:text-sm text-snow/70">Peserta bulan ini</div>
          <div className="text-xs text-snow/55 mt-0.5">
            {stats.monthlyParticipants > 0 ? "Bulan berjalan" : "Belum ada peserta"}
          </div>
        </div>
        <div className="bg-[#221F30] rounded-2xl p-4 md:px-4.5 md:py-4 flex flex-col gap-1">
          <div className="font-display font-bold text-2xl text-snow">
            {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "0"}
          </div>
          <div className="text-xs md:text-sm text-snow/70">Rating rata-rata</div>
          <div className="text-xs text-snow/55 mt-0.5">
            {stats.totalReviews && stats.totalReviews > 0
              ? `dari ${stats.totalReviews} ulasan`
              : "Belum ada ulasan"}
          </div>
        </div>
        <div className="bg-[#221F30] rounded-2xl p-4 md:px-4.5 md:py-4 flex flex-col gap-1">
          <div className="font-display font-bold text-2xl text-snow">{stats.unansweredComments}</div>
          <div className="text-xs md:text-sm text-snow/70">Komentar belum dibalas</div>
          <div className="text-xs text-snow/55 mt-0.5">
            {stats.unansweredComments > 0 ? "Perlu ditanggapi" : "Semua terjawab"}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="md:col-span-1">
          <div className="relative">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-snow/50"
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
              placeholder="Cari kelas"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="bg-snow/10 border-0 rounded-lg px-3 py-2.5 pl-9 text-sm text-snow w-full outline-none focus:ring-1 focus:ring-volt"
            />
          </div>
        </div>

        <div>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="bg-snow/10 border-0 rounded-lg px-3 py-2.5 text-sm text-snow w-full outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#17151F]">Semua kategori</option>
            <option value="dasar" className="bg-[#17151F]">Dasar</option>
            <option value="teknik" className="bg-[#17151F]">Teknik</option>
            <option value="taktik" className="bg-[#17151F]">Posisi & taktik</option>
            <option value="mf" className="bg-[#17151F]">Mental & fisik</option>
            <option value="khusus" className="bg-[#17151F]">Program khusus</option>
          </select>
        </div>

        <div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="bg-snow/10 border-0 rounded-lg px-3 py-2.5 text-sm text-snow w-full outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#17151F]">Semua status</option>
            <option value="aktif" className="bg-[#17151F]">Aktif</option>
            <option value="draft" className="bg-[#17151F]">Draft</option>
            <option value="penuh" className="bg-[#17151F]">Penuh</option>
          </select>
        </div>

        <div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-snow/10 border-0 rounded-lg px-3 py-2.5 text-sm text-snow w-full outline-none cursor-pointer"
          >
            <option value="near" className="bg-[#17151F]">Jadwal terdekat</option>
            <option value="title" className="bg-[#17151F]">Nama A–Z</option>
          </select>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-snow/10 text-left text-xs uppercase tracking-wider text-snow/65">
              <th className="py-2.5 pr-3 font-semibold">Kelas</th>
              <th className="py-2.5 pr-3 font-semibold">Coach</th>
              <th className="py-2.5 pr-3 font-semibold">Harga</th>
              <th className="py-2.5 pr-3 font-semibold">Jadwal berikutnya</th>
              <th className="py-2.5 pr-3 font-semibold">Slot terisi</th>
              <th className="py-2.5 pr-3 font-semibold">Rating</th>
              <th className="py-2.5 pr-3 font-semibold">Status</th>
              <th className="py-2.5 text-right font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((c) => (
              <tr key={c.id} className="border-b border-snow/10 hover:bg-snow/[0.02]">
                <td className="py-3.5 pr-3 align-middle">
                  <div className="font-display font-bold text-snow">{c.title}</div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-snow/70">
                    <div className="flex items-center gap-1">
                      {c.suitablePins.map((pin) => (
                        <span
                          key={pin}
                          title={`Pin ${pin}`}
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{
                            background: PIN_COLORS[pin]?.bg || "#FFF",
                            border: PIN_COLORS[pin]?.border || "none",
                          }}
                        />
                      ))}
                    </div>
                    <span className="capitalize">{c.category}</span>
                  </div>
                </td>
                <td className="py-3.5 pr-3 align-middle text-sm text-snow/80 whitespace-nowrap">
                  {c.coachName ? `Coach ${c.coachName}` : "Pilih coach"}
                </td>
                <td className="py-3.5 pr-3 align-middle whitespace-nowrap text-snow font-semibold">
                  {formatRupiah(c.price)}
                </td>
                <td className="py-3.5 pr-3 align-middle text-xs text-snow/80 whitespace-nowrap">
                  {c.nextSchedule}
                </td>
                <td className="py-3.5 pr-3 align-middle">
                  <div className="flex items-center gap-2 min-w-28">
                    <div className="flex-1 h-1.5 rounded-full bg-snow/12 overflow-hidden">
                      <div
                        className={`h-full ${c.slotPercentage >= 100 ? "bg-coral" : "bg-volt"}`}
                        style={{ width: `${c.slotPercentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold whitespace-nowrap">{c.slotRatio}</span>
                  </div>
                </td>
                <td className="py-3.5 pr-3 align-middle whitespace-nowrap text-xs text-snow/90">
                  ★ {c.rating}
                </td>
                <td className="py-3.5 pr-3 align-middle whitespace-nowrap">
                  {c.status === "Aktif" && <Badge tone="volt">● Aktif</Badge>}
                  {c.status === "Penuh" && <Badge tone="coral">Penuh</Badge>}
                  {c.status === "Draft" && <Badge tone="faint">Draft</Badge>}
                </td>
                <td className="py-3.5 text-right align-middle">
                  <Link
                    href={`/admin/kelas/${c.id}`}
                    className="btn px-4 py-2 text-xs font-bold rounded-lg bg-snow/12 hover:bg-snow/20 text-snow no-underline tracking-button whitespace-nowrap"
                  >
                    Buka
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden flex flex-col gap-2.5">
        {paged.map((c) => (
          <div key={c.id} className="bg-[#1F1C2B] rounded-2xl p-4 flex flex-col gap-2.5">
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="font-display font-bold text-base text-snow">{c.title}</div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-snow/70">
                  <div className="flex items-center gap-1">
                    {c.suitablePins.map((pin) => (
                      <span
                        key={pin}
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{
                          background: PIN_COLORS[pin]?.bg || "#FFF",
                          border: PIN_COLORS[pin]?.border || "none",
                        }}
                      />
                    ))}
                  </div>
                  <span className="capitalize">{c.category}</span>
                </div>
              </div>
              <div>
                {c.status === "Aktif" && <Badge tone="volt">● Aktif</Badge>}
                {c.status === "Penuh" && <Badge tone="coral">Penuh</Badge>}
                {c.status === "Draft" && <Badge tone="faint">Draft</Badge>}
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-snow/70">
              <span>{c.nextSchedule}</span>
              <span>★ {c.rating}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-snow/12 overflow-hidden">
                <div
                  className={`h-full ${c.slotPercentage >= 100 ? "bg-coral" : "bg-volt"}`}
                  style={{ width: `${c.slotPercentage}%` }}
                />
              </div>
              <span className="text-xs font-bold text-snow">{c.slotRatio}</span>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-snow/10">
              <span className="font-bold text-snow text-sm">{formatRupiah(c.price)}</span>
              <Link
                href={`/admin/kelas/${c.id}`}
                className="btn px-4 py-2 text-xs font-bold rounded-lg bg-snow/12 text-snow no-underline tracking-button"
              >
                Buka
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center text-xs text-snow/60 pt-2">
        <span>Menampilkan {paged.length} dari {filtered.length} kelas</span>
      </div>

      <Pagination page={clampedPage} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
