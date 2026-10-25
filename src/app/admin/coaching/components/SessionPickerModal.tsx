"use client";

import { useMemo, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import type { CoachingSessionSummary } from "@/lib/coaching-db";
import type { SessionTab } from "@/lib/coaching";
import { formatDateShortIndo } from "@/lib/format";
import { Pagination } from "@/components/ui/Pagination";
import { SearchIcon } from "@/components/ui/icons";

const PAGE_SIZE = 8;

/** Browse/search sessions in the active status tab as a table instead of a long native <select> —
 *  picks up badly once there are a lot of sessions. Click a row to switch to that session. */
export function SessionPickerModal({
  sessions,
  activeSessionId,
  sessionTab,
  onClose,
}: {
  sessions: CoachingSessionSummary[];
  activeSessionId: string;
  sessionTab: SessionTab;
  onClose: () => void;
}) {
  const router = useRouter();
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

  const pick = (id: string) => {
    onClose();
    if (id !== activeSessionId) router.push(`/admin/coaching?when=${sessionTab}&session=${id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-[640px] max-h-[82vh] overflow-hidden flex flex-col bg-[#1F1C2B] rounded-2xl border border-[#FBF7F1]/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 p-4 border-b border-[#FBF7F1]/8">
          <h2 className="font-display font-bold text-lg m-0 text-[#FBF7F1]">Pilih sesi coaching</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#FBF7F1]/60 hover:bg-[#FBF7F1]/10 border-0 bg-transparent cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-4 pb-3 relative">
          <SearchIcon className="absolute left-7 top-1/2 -translate-y-1/2 text-[#FBF7F1]/50 pointer-events-none" />
          <input
            autoFocus
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

        <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-1.5">
          {paged.length === 0 && (
            <div className="text-center py-10 text-sm text-[#FBF7F1]/50">Tidak ada sesi yang cocok.</div>
          )}
          {paged.map((s) => {
            const active = s.id === activeSessionId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => pick(s.id)}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                  active ? "border-[#FFD43B]/60 bg-[#FFD43B]/10" : "border-[#FBF7F1]/8 bg-[#17151F]/40 hover:border-[#FBF7F1]/20"
                }`}
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
              </button>
            );
          })}
        </div>

        <div className="p-4 pt-3">
          <Pagination page={clampedPage} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}
