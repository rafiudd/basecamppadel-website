"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import type { CoachingSessionSummary } from "@/lib/coaching-db";
import { defaultSessionDir, sessionListHref, type SessionListQuery, type SessionSort, type SessionTab } from "@/lib/coaching";
import { formatDateShortIndo } from "@/lib/format";
import { LinkPagination } from "@/components/ui/Pagination";
import { SearchIcon } from "@/components/ui/icons";

const SORT_LABEL: Record<SessionSort, string> = {
  date: "Tanggal",
  title: "Sesi",
  venue: "Venue",
  participants: "Peserta",
};

const SEARCH_DEBOUNCE_MS = 350;

/** Main content of the coaching page when no session is picked yet: one page of the sessions in
 *  the active status tab. Search, sort and paging live in the URL and run on the server, so the
 *  page only ever loads the rows it shows. Click a row to open that session's workspace. */
export function SessionListTable({
  rows,
  total,
  totalPages,
  query,
  sessionTab,
}: {
  rows: CoachingSessionSummary[];
  total: number;
  totalPages: number;
  query: SessionListQuery;
  sessionTab: SessionTab;
}) {
  const router = useRouter();
  const [q, setQ] = useState(query.q);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { sort: sortKey, dir: sortDir, page } = query;

  const hrefWith = (patch: Partial<SessionListQuery>) => sessionListHref(sessionTab, { ...query, page: 1, ...patch });

  const onSearch = (value: string) => {
    setQ(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => router.replace(hrefWith({ q: value.trim() })), SEARCH_DEBOUNCE_MS);
  };

  const toggleSort = (key: SessionSort) => {
    const dir = key === sortKey ? (sortDir === "asc" ? "desc" : "asc") : defaultSessionDir(key);
    router.push(hrefWith({ sort: key, dir }));
  };

  const arrow = (key: SessionSort) => (sortKey === key ? (sortDir === "asc" ? "↑" : "↓") : "");

  return (
    <div className="bg-[#1F1C2B] rounded-2xl p-3.5 flex flex-col gap-3 border border-[#FBF7F1]/5">
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FBF7F1]/50 pointer-events-none" />
          <input
            type="search"
            placeholder="Cari judul sesi atau venue..."
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            className="bg-[#FBF7F1]/10 border-0 rounded-lg pl-10 pr-3 py-2.5 min-h-11 font-sans text-[15px] text-[#FBF7F1] w-full box-border focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
          />
        </div>
        {/* Sort control for mobile — desktop sorts via the table headers below */}
        <div className="sm:hidden flex gap-1.5">
          <select
            aria-label="Urutkan"
            value={sortKey}
            onChange={(e) => toggleSort(e.target.value as SessionSort)}
            className="bg-[#FBF7F1]/10 border-0 rounded-lg px-3 py-2.5 min-h-11 font-sans text-sm text-[#FBF7F1] flex-1 box-border focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
          >
            {(Object.keys(SORT_LABEL) as SessionSort[]).map((k) => (
              <option key={k} value={k} className="bg-[#17151F]">
                Urutkan: {SORT_LABEL[k]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => router.push(hrefWith({ dir: sortDir === "asc" ? "desc" : "asc" }))}
            aria-label={sortDir === "asc" ? "Urutan naik" : "Urutan turun"}
            className="flex-none w-11 h-11 rounded-lg bg-[#FBF7F1]/10 text-[#FBF7F1] border-0 cursor-pointer text-base"
          >
            {sortDir === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-10 text-sm text-[#FBF7F1]/50">Tidak ada sesi yang cocok.</div>
      ) : (
        <>
          {/* Desktop table */}
          <table className="hidden sm:table w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-[#FBF7F1]/60 uppercase tracking-wide">
                {(["title", "date", "venue", "participants"] as SessionSort[]).map((key) => (
                  <th key={key} className={`pb-2.5 pr-3 font-semibold ${key === "participants" ? "text-right" : ""}`}>
                    <button
                      type="button"
                      onClick={() => toggleSort(key)}
                      className={`border-0 bg-transparent p-0 cursor-pointer inline-flex items-center gap-1 uppercase tracking-wide text-xs font-semibold hover:text-[#FBF7F1] transition-colors ${
                        sortKey === key ? "text-[#FFD43B]" : "text-[#FBF7F1]/60"
                      }`}
                    >
                      {SORT_LABEL[key]} <span className="w-3 inline-block">{arrow(key)}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => router.push(`/admin/coaching?when=${sessionTab}&session=${s.id}`)}
                  className="border-t border-[#FBF7F1]/8 hover:bg-[#FBF7F1]/[0.03] transition-colors cursor-pointer"
                >
                  <td className="py-3 pr-3">
                    <span className="font-bold text-[#FBF7F1]">{s.title}</span>
                    {s.coaches.length > 0 && (
                      <div className="text-xs text-[#FBF7F1]/55 mt-0.5 truncate">{s.coaches.map((c) => c.name).join(", ")}</div>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-[#FBF7F1]/80 whitespace-nowrap">{formatDateShortIndo(s.session_date)}</td>
                  <td className="py-3 pr-3 text-[#FBF7F1]/80 whitespace-nowrap">{s.venue_name || "—"}</td>
                  <td className="py-3 pr-3 text-right whitespace-nowrap">
                    <div className="font-bold text-[#FBF7F1]">
                      {s.ratedPlayers}/{s.totalPlayers}
                    </div>
                    <div className="text-[10px] text-[#FBF7F1]/50">dinilai</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="sm:hidden flex flex-col gap-1.5">
            {rows.map((s) => (
              <Link
                key={s.id}
                href={`/admin/coaching?when=${sessionTab}&session=${s.id}`}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#FBF7F1]/8 bg-[#17151F]/40 hover:border-[#FBF7F1]/20 transition-colors no-underline"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-[#FBF7F1] truncate">{s.title}</div>
                  <div className="text-xs text-[#FBF7F1]/60 mt-0.5 truncate">
                    {formatDateShortIndo(s.session_date)}
                    {s.venue_name ? ` · ${s.venue_name}` : ""}
                    {s.coaches.length > 0 ? ` · ${s.coaches.map((c) => c.name).join(", ")}` : ""}
                  </div>
                </div>
                <div className="flex-none text-right">
                  <div className="text-xs font-bold text-[#FBF7F1]">
                    {s.ratedPlayers}/{s.totalPlayers}
                  </div>
                  <div className="text-[10px] text-[#FBF7F1]/50">dinilai</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {totalPages > 1 && <div className="text-xs text-[#FBF7F1]/50 text-center">{total} sesi</div>}
      <LinkPagination page={page} totalPages={totalPages} hrefFor={(p) => sessionListHref(sessionTab, { ...query, page: p })} />
    </div>
  );
}
