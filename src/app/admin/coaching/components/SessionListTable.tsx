"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CoachingSessionSummary } from "@/lib/coaching-db";
import type { SessionTab } from "@/lib/coaching";
import { formatDateShortIndo } from "@/lib/format";
import { Pagination } from "@/components/ui/Pagination";
import { SearchIcon } from "@/components/ui/icons";

const PAGE_SIZE = 15;

/** Main content of the coaching page when no session is picked yet: every session in the active
 *  status tab, searchable and paginated — the <select> this replaced became unusable once a coach
 *  had run a hundred sessions. Click a row to open that session's workspace. */
export function SessionListTable({ sessions, sessionTab }: { sessions: CoachingSessionSummary[]; sessionTab: SessionTab }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return sessions;
    return sessions.filter(
      (s) => s.title.toLowerCase().includes(term) || (s.venue_name ?? "").toLowerCase().includes(term),
    );
  }, [sessions, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const paged = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  return (
    <div className="bg-[#1F1C2B] rounded-2xl p-3.5 flex flex-col gap-3 border border-[#FBF7F1]/5">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FBF7F1]/50 pointer-events-none" />
        <input
          type="search"
          placeholder="Cari judul sesi atau venue..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className="bg-[#FBF7F1]/10 border-0 rounded-lg pl-10 pr-3 py-2.5 min-h-11 font-sans text-[15px] text-[#FBF7F1] w-full box-border focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
        />
      </div>

      {paged.length === 0 ? (
        <div className="text-center py-10 text-sm text-[#FBF7F1]/50">Tidak ada sesi yang cocok.</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {paged.map((s) => (
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
      )}

      <Pagination page={clampedPage} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
