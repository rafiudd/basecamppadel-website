"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Coach } from "@/lib/database.types";
import type { CoachingSessionSummary, SessionFullData } from "@/lib/coaching-db";
import { PlusIcon, EditIcon } from "@/components/ui/icons";

export function CoachingHeader({
  sessions,
  sessionData,
  activeSessionId,
  allCoaches,
  selectedCoachFilter,
  isAdmin,
  isPublishingAll,
  onCoachFilterChange,
  onOpenImportRekap,
  onExportXlsx,
  onPublishAll,
}: {
  sessions: CoachingSessionSummary[];
  sessionData: SessionFullData | null;
  activeSessionId: string;
  allCoaches: Coach[];
  selectedCoachFilter: string;
  isAdmin: boolean;
  isPublishingAll: boolean;
  onCoachFilterChange: (coachId: string) => void;
  onOpenImportRekap: () => void;
  onExportXlsx: () => void;
  onPublishAll: () => void;
}) {
  const router = useRouter();
  const activeSession = sessionData?.session;

  return (
    <>
      {/* 1. TOP HEADER (Matches Prototype Desktop & Mobile) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          {/* Mobile Back Link if on mobile */}
          <div className="block lg:hidden mb-1">
            <span className="text-sm text-[#FBF7F1]/70">
              ← {activeSession ? `${activeSession.title} · ${activeSession.session_date}` : "Coaching Clinic"}
            </span>
          </div>
          <h1 className="font-display font-bold text-2xl lg:text-[26px] m-0 leading-tight">
            Catatan coaching
          </h1>
          <p className="m-0 mt-1 text-sm text-[#FBF7F1]/70">
            Isi nilai &amp; catatan tiap pemain setelah sesi. Pemain lihat hasilnya di profil mereka.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <>
              <Link
                href="/admin/coaching/skills"
                className="border-0 rounded-lg min-h-11 px-4 font-sans font-bold text-sm whitespace-nowrap inline-flex items-center justify-center gap-2 bg-[#FBF7F1]/10 text-[#FBF7F1] hover:bg-[#FBF7F1]/15 transition-all no-underline"
              >
                Master Teknik
              </Link>
              <Link
                href="/admin/coaching/sessions/new"
                title="Tambah Sesi Baru"
                aria-label="Tambah Sesi Baru"
                className="border-0 rounded-lg w-11 h-11 inline-flex items-center justify-center bg-[#FFD43B] text-[#17151F] hover:bg-[#FFD43B]/90 transition-all no-underline shadow-xs cursor-pointer"
              >
                <PlusIcon size={18} strokeWidth={2.4} />
              </Link>
              {sessionData && (
                <Link
                  href={`/admin/coaching/sessions/${sessionData.session.id}`}
                  title="Edit Sesi Ini"
                  aria-label="Edit Sesi Ini"
                  className="border-0 rounded-lg w-11 h-11 inline-flex items-center justify-center bg-[#FBF7F1]/10 text-[#FBF7F1] hover:bg-[#FBF7F1]/15 transition-all no-underline cursor-pointer"
                >
                  <EditIcon size={18} />
                </Link>
              )}
              <button
                type="button"
                onClick={onOpenImportRekap}
                className="border-0 rounded-lg min-h-11 px-4 font-sans font-bold text-sm whitespace-nowrap inline-flex items-center justify-center gap-2 bg-[#FBF7F1]/10 text-[#FBF7F1] hover:bg-[#FBF7F1]/15 transition-all cursor-pointer"
              >
                Import Excel
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onExportXlsx}
            disabled={!sessionData}
            className="border-0 rounded-lg min-h-11 px-4.5 font-sans font-bold text-sm whitespace-nowrap inline-flex items-center justify-center gap-2 bg-[#FBF7F1]/12 text-[#FBF7F1] hover:bg-[#FBF7F1]/18 transition-all disabled:opacity-50 cursor-pointer"
          >
            Export rekap (.xlsx)
          </button>
          <button
            type="button"
            onClick={onPublishAll}
            disabled={isPublishingAll || !sessionData}
            className="border-0 rounded-lg min-h-11 px-4.5 font-sans font-bold text-sm whitespace-nowrap inline-flex items-center justify-center gap-2 bg-[#FF5A3C] text-[#17151F] hover:bg-[#FF5A3C]/90 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isPublishingAll ? "Mengirim..." : "Kirim semua ke pemain"}
          </button>
        </div>
      </div>

      {/* 2. SESSION & FILTER HEADER BAR (Exact Prototype: #221F30, p: 18px 20px) */}
      <div className="bg-[#221F30] rounded-2xl p-4 md:p-[18px_20px] flex flex-wrap items-end gap-4 border border-[#FBF7F1]/5">
        {/* Sesi coaching selector */}
        <label className="block flex-2 min-w-64">
          <span className="text-[12px] tracking-[0.08em] text-[#FBF7F1]/70 uppercase mb-2 block font-medium">
            Sesi coaching
          </span>
          <select
            value={activeSessionId}
            onChange={(e) => {
              router.push(`/admin/coaching?session=${e.target.value}`);
            }}
            className="bg-[#FBF7F1]/10 border-0 rounded-lg px-3 py-2.5 min-h-11 font-sans text-[15px] text-[#FBF7F1] w-full box-border appearance-auto focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#17151F] text-[#FBF7F1]">
                {s.title} · {s.session_date} {s.venue_name ? `· ${s.venue_name}` : ""}
              </option>
            ))}
          </select>
        </label>

        {/* Coach filter */}
        <label className="block flex-1 min-w-44">
          <span className="text-[12px] tracking-[0.08em] text-[#FBF7F1]/70 uppercase mb-2 block font-medium">
            Coach
          </span>
          <select
            value={selectedCoachFilter}
            onChange={(e) => onCoachFilterChange(e.target.value)}
            className="bg-[#FBF7F1]/10 border-0 rounded-lg px-3 py-2.5 min-h-11 font-sans text-[15px] text-[#FBF7F1] w-full box-border appearance-auto focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
          >
            <option value="all" className="bg-[#17151F] text-[#FBF7F1]">
              Semua Coach
            </option>
            {allCoaches.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#17151F] text-[#FBF7F1]">
                {c.name}
              </option>
            ))}
          </select>
        </label>

        {/* Progres penilaian */}
        <div className="flex-1 min-w-48">
          <span className="text-[12px] tracking-[0.08em] text-[#FBF7F1]/70 uppercase mb-2 block font-medium">
            Progres penilaian
          </span>
          <div className="flex items-center gap-2.5 min-h-11">
            <div
              role="img"
              aria-label={`${sessionData?.progress.rated ?? 0} dari ${sessionData?.progress.total ?? 0} pemain dinilai`}
              className="flex-grow h-2 rounded-full bg-[#FBF7F1]/12 overflow-hidden"
            >
              <div
                className="h-full bg-[#6FD39A] transition-all duration-300"
                style={{
                  width: `${
                    sessionData && sessionData.progress.total > 0
                      ? Math.round((sessionData.progress.rated / sessionData.progress.total) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            <span className="font-bold text-sm whitespace-nowrap">
              {sessionData?.progress.rated ?? 0} / {sessionData?.progress.total ?? 0}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
