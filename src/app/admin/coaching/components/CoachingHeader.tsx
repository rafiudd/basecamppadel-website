"use client";

import Link from "next/link";
import type { SessionFullData } from "@/lib/coaching-db";
import { SESSION_TABS, type SessionTab, type SessionStatus, TAB_STATUS, statusTab } from "@/lib/coaching";
import { formatDateShortIndo } from "@/lib/format";
import {
  PlusIcon,
  ListIcon,
  ChartIcon,
  UploadIcon,
  ImageIcon,
  EditIcon,
} from "@/components/ui/icons";

const TAB_LABELS: Record<SessionTab, string> = { draft: "Draft", berjalan: "Berjalan", selesai: "Selesai" };
const STATUS_BADGE_TONE: Record<SessionTab, string> = {
  draft: "bg-[#FBF7F1]/12 text-[#FBF7F1]/75",
  berjalan: "bg-[#FFD43B]/18 text-[#FFD43B]",
  selesai: "bg-[#6FD39A]/18 text-[#6FD39A]",
};

const iconBtn = "flex-none border-0 rounded-lg w-9 h-9 inline-flex items-center justify-center bg-[#FBF7F1]/10 text-[#FBF7F1] hover:bg-[#FBF7F1]/15 transition-all no-underline cursor-pointer";

export function CoachingHeader({
  sessionTab,
  sessionCounts,
  sessionData,
  isAdmin,
  isPublishingAll,
  isUpdatingStatus = false,
  onOpenImportRekap,
  onExportXlsx,
  onPublishAll,
  onStatusChange,
}: {
  sessionTab: SessionTab;
  sessionCounts: Record<SessionTab, number>;
  sessionData: SessionFullData | null;
  isAdmin: boolean;
  isPublishingAll: boolean;
  isUpdatingStatus?: boolean;
  onOpenImportRekap: () => void;
  onExportXlsx: () => void;
  onPublishAll: () => void;
  onStatusChange?: (newStatus: SessionStatus) => void;
}) {
  // ── Session open: a compact back/actions row + progress.
  if (sessionData) {
    const session = sessionData.session;
    const currentStatus = (session.status as SessionStatus) || TAB_STATUS[sessionTab] || "draft";
    const currentTab = statusTab(currentStatus);
    const pct = sessionData.progress.total > 0 ? Math.round((sessionData.progress.rated / sessionData.progress.total) * 100) : 0;
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link href={`/admin/coaching?when=${sessionTab}`} className={`${iconBtn} w-auto px-3 text-sm font-bold whitespace-nowrap`}>
              ← Daftar sesi
            </Link>
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#FBF7F1] truncate">{session.title}</div>
              <div className="text-xs text-[#FBF7F1]/60 truncate">
                {formatDateShortIndo(session.session_date)}
                {session.venue_name ? ` · ${session.venue_name}` : ""}
              </div>
            </div>

            {/* Dropdown status sesi */}
            <select
              aria-label="Status sesi"
              value={currentStatus}
              disabled={isUpdatingStatus}
              onChange={(e) => onStatusChange?.(e.target.value as SessionStatus)}
              className={`rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap cursor-pointer border border-transparent hover:border-[#FBF7F1]/20 focus:outline-none focus:ring-1 focus:ring-[#FFD43B] transition-all ${STATUS_BADGE_TONE[currentTab]} disabled:opacity-50 flex-none`}
            >
              <option value="draft" className="bg-[#1F1C2B] text-[#FBF7F1]">
                Draft
              </option>
              <option value="active" className="bg-[#1F1C2B] text-[#FFD43B]">
                Berjalan
              </option>
              <option value="finished" className="bg-[#1F1C2B] text-[#6FD39A]">
                Selesai
              </option>
            </select>
          </div>

          {/* Action buttons: edit session / import / poster / export / kirim semua */}
          <div className="flex items-center gap-1.5 flex-wrap flex-none">
            {isAdmin && (
              <Link
                href={`/admin/coaching/sessions/${session.id}`}
                title="Edit sesi"
                aria-label="Edit sesi"
                className={`${iconBtn} gap-1.5 sm:w-auto sm:px-2.5`}
              >
                <EditIcon size={15} />
                <span className="hidden sm:inline text-xs font-semibold">Edit sesi</span>
              </Link>
            )}
            {isAdmin && (
              <button type="button" onClick={onOpenImportRekap} title="Import Excel" aria-label="Import Excel" className={iconBtn}>
                <UploadIcon size={16} />
              </button>
            )}
            <a href={`/admin/coaching/sessions/${session.id}/poster`} title="Buat poster" aria-label="Buat poster" className={iconBtn}>
              <ImageIcon size={16} />
            </a>
            <button type="button" onClick={onExportXlsx} title="Export rekap (.xlsx)" aria-label="Export rekap (.xlsx)" className={iconBtn}>
              <ChartIcon size={16} />
            </button>
            <button
              type="button"
              onClick={onPublishAll}
              disabled={isPublishingAll}
              data-loading={isPublishingAll || undefined}
              className="flex-none border-0 rounded-lg h-9 px-3.5 font-sans font-bold text-xs whitespace-nowrap inline-flex items-center justify-center gap-1.5 bg-[#FF5A3C] text-[#17151F] hover:bg-[#FF5A3C]/90 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isPublishingAll ? "Mengirim..." : "Kirim semua"}
            </button>
          </div>
        </div>

        {/* 1. Progress penilaian */}
        <div className="bg-[#221F30] rounded-xl p-3.5 border border-[#FBF7F1]/5">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs tracking-[0.08em] text-[#FBF7F1]/70 uppercase font-medium">Progres penilaian</span>
            <span className="font-bold text-sm text-[#FBF7F1]">
              {sessionData.progress.rated} / {sessionData.progress.total}
            </span>
          </div>
          <div
            role="img"
            aria-label={`${sessionData.progress.rated} dari ${sessionData.progress.total} pemain dinilai`}
            className="h-2 rounded-full bg-[#FBF7F1]/12 overflow-hidden"
          >
            <div className="h-full bg-[#6FD39A] transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {/* 2. Tab "Belum dinilai" / "Selesai dinilai" is PlayerListTable's own status filter, rendered right below this */}
      </div>
    );
  }

  // ── No session open: the session list below is the page — title, global actions, and the
  // Draft/Berjalan/Selesai tabs that pick which list shows.
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-xl lg:text-[26px] m-0 leading-tight">Catatan coaching</h1>
          <p className="m-0 mt-1 text-xs lg:text-sm text-[#FBF7F1]/70">
            Isi nilai &amp; catatan tiap pemain setelah sesi. Pemain lihat hasilnya di profil mereka.
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Link href="/admin/coaching/skills" title="Master Teknik" aria-label="Master Teknik" className={`${iconBtn} w-10 h-10 lg:w-11 lg:h-11`}>
              <ListIcon size={18} />
            </Link>
            <Link
              href="/admin/coaching/sessions/new"
              className="border-0 rounded-lg h-10 lg:h-11 px-4 inline-flex items-center justify-center gap-1.5 bg-[#FFD43B] text-[#17151F] hover:bg-[#FFD43B]/90 transition-all no-underline shadow-xs cursor-pointer font-bold text-sm whitespace-nowrap"
            >
              <PlusIcon size={16} strokeWidth={2.4} />
              Sesi baru
            </Link>
          </div>
        )}
      </div>

      <SessionTabs active={sessionTab} counts={sessionCounts} />
    </div>
  );
}

/** The session tabs; each opens its own list (the first session in it). */
function SessionTabs({ active, counts }: { active: SessionTab; counts: Record<SessionTab, number> }) {
  return (
    <nav aria-label="Sesi coaching" className="flex gap-1 p-1 rounded-xl bg-[#221F30] border border-[#FBF7F1]/5 self-start">
      {SESSION_TABS.map((t) => (
        <Link
          key={t}
          href={`/admin/coaching?when=${t}`}
          aria-current={active === t ? "page" : undefined}
          className={`no-underline rounded-lg px-4 min-h-10 inline-flex items-center gap-2 text-sm font-bold transition-colors ${
            active === t ? "bg-[#FFD43B] text-[#17151F]" : "text-[#FBF7F1]/75 hover:text-[#FBF7F1] hover:bg-[#FBF7F1]/5"
          }`}
        >
          {TAB_LABELS[t]}
          <span className={`rounded-full px-2 text-xs ${active === t ? "bg-[#17151F]/15" : "bg-[#FBF7F1]/10"}`}>{counts[t]}</span>
        </Link>
      ))}
    </nav>
  );
}
