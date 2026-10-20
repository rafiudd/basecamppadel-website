"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import type { Coach } from "@/lib/database.types";
import type { CoachingSessionSummary, SessionFullData } from "@/lib/coaching-db";
import { SESSION_TABS, TAB_STATUS, type SessionTab } from "@/lib/coaching";
import { useTopLoaderWhile } from "@/components/TopLoader";
import { toast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { setCoachingSessionStatusAction } from "../session-actions";
import {
  PlusIcon,
  EditIcon,
  DotsHorizontalIcon,
  ListIcon,
  ChartIcon,
} from "@/components/ui/icons";

export function CoachingHeader({
  sessions,
  sessionTab,
  sessionCounts,
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
  sessionTab: SessionTab;
  sessionCounts: Record<SessionTab, number>;
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const activeSession = sessionData?.session;

  return (
    <>
      {/* ── 1. TOP HEADER ── */}

      {/* Desktop Top Header (>= lg) */}
      <div className="hidden lg:flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-[26px] m-0 leading-tight">
            Catatan coaching
          </h1>
          <p className="m-0 mt-1 text-sm text-[#FBF7F1]/70">
            Isi nilai &amp; catatan tiap pemain setelah sesi. Pemain lihat hasilnya di profil mereka.
          </p>
        </div>

        {/* Action Buttons for Desktop */}
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
            data-loading={isPublishingAll || undefined}
            className="border-0 rounded-lg min-h-11 px-4.5 font-sans font-bold text-sm whitespace-nowrap inline-flex items-center justify-center gap-2 bg-[#FF5A3C] text-[#17151F] hover:bg-[#FF5A3C]/90 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isPublishingAll ? "Mengirim..." : "Kirim semua ke pemain"}
          </button>
        </div>
      </div>

      {/* Mobile Top Header (< lg) — Simplified & Compact */}
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <div>
          <h1 className="font-display font-bold text-xl m-0 leading-tight">
            Catatan coaching
          </h1>
          <p className="hidden sm:block m-0 mt-0.5 text-xs text-[#FBF7F1]/60">
            Isi nilai &amp; catatan tiap pemain setelah sesi.
          </p>
        </div>

        {/* Compact Action Controls */}
        <div className="flex items-center gap-1.5 flex-none relative">
          {sessionData && (
            <button
              type="button"
              onClick={onPublishAll}
              disabled={isPublishingAll}
              data-loading={isPublishingAll || undefined}
              title="Kirim semua ke pemain"
              className="border-0 rounded-lg h-9 px-3 font-sans font-bold text-xs whitespace-nowrap inline-flex items-center justify-center gap-1 bg-[#FF5A3C] text-[#17151F] hover:bg-[#FF5A3C]/90 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isPublishingAll ? "Mengirim..." : "Kirim Semua"}
            </button>
          )}

          {isAdmin && (
            <Link
              href="/admin/coaching/sessions/new"
              title="Tambah Sesi Baru"
              aria-label="Tambah Sesi Baru"
              className="border-0 rounded-lg w-9 h-9 inline-flex items-center justify-center bg-[#FFD43B] text-[#17151F] hover:bg-[#FFD43B]/90 transition-all no-underline cursor-pointer shadow-xs"
            >
              <PlusIcon size={16} strokeWidth={2.4} />
            </Link>
          )}

          {/* More actions dropdown (•••) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="Aksi lainnya"
              className={`border-0 rounded-lg w-9 h-9 inline-flex items-center justify-center transition-all cursor-pointer ${
                showMobileMenu
                  ? "bg-[#FBF7F1]/20 text-[#FBF7F1]"
                  : "bg-[#FBF7F1]/10 text-[#FBF7F1]/80 hover:bg-[#FBF7F1]/15"
              }`}
            >
              <DotsHorizontalIcon size={16} />
            </button>

            {showMobileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMobileMenu(false)}
                />
                <div className="absolute right-0 top-10 z-50 w-52 rounded-xl bg-[#221F30] border border-[#FBF7F1]/15 shadow-2xl p-1.5 flex flex-col gap-1 text-sm font-sans animate-in fade-in zoom-in-95 duration-150">
                  {isAdmin && sessionData && (
                    <Link
                      href={`/admin/coaching/sessions/${sessionData.session.id}`}
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#FBF7F1] hover:bg-[#FBF7F1]/10 transition-colors no-underline text-xs font-semibold"
                    >
                      <EditIcon size={15} />
                      Edit Sesi Ini
                    </Link>
                  )}
                  {isAdmin && (
                    <Link
                      href="/admin/coaching/skills"
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#FBF7F1] hover:bg-[#FBF7F1]/10 transition-colors no-underline text-xs font-semibold"
                    >
                      <ListIcon size={15} />
                      Master Teknik
                    </Link>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMobileMenu(false);
                        onOpenImportRekap();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#FBF7F1] hover:bg-[#FBF7F1]/10 transition-colors text-left text-xs font-semibold cursor-pointer border-0 bg-transparent"
                    >
                      <PlusIcon size={15} />
                      Import Excel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileMenu(false);
                      onExportXlsx();
                    }}
                    disabled={!sessionData}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#FBF7F1] hover:bg-[#FBF7F1]/10 transition-colors text-left text-xs font-semibold disabled:opacity-40 cursor-pointer border-0 bg-transparent"
                  >
                    <ChartIcon size={15} />
                    Export Rekap (.xlsx)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Draft / Berjalan / Selesai: one tab per session status */}
      <SessionTabs active={sessionTab} counts={sessionCounts} />

      {/* ── 2. SESSION & FILTER HEADER BAR ── */}

      {/* Desktop Filter Bar (>= lg) */}
      <div className="hidden lg:flex bg-[#221F30] rounded-2xl p-[18px_20px] items-end gap-4 border border-[#FBF7F1]/5">
        {/* Sesi coaching selector */}
        <label className="block flex-2 min-w-64">
          <span className="text-[12px] tracking-[0.08em] text-[#FBF7F1]/70 uppercase mb-2 block font-medium">
            Sesi coaching
          </span>
          <select
            value={activeSessionId}
            onChange={(e) => {
              router.push(`/admin/coaching?when=${sessionTab}&session=${e.target.value}`);
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

        {/* Status of the session on screen: move it to another tab in one click */}
        {activeSession && (
          <div className="flex-none">
            <span className="text-[12px] tracking-[0.08em] text-[#FBF7F1]/70 uppercase mb-2 block font-medium">
              Status sesi
            </span>
            <SessionStatusSwitch sessionId={activeSession.id} current={sessionTab} />
          </div>
        )}

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

      {/* Mobile Filter Bar (< lg) — Compact & Space-efficient */}
      <div className="lg:hidden bg-[#221F30] rounded-xl p-3 flex flex-col gap-2.5 border border-[#FBF7F1]/5">
        {/* Row 1: Sesi coaching selector */}
        <div>
          <span className="text-[11px] tracking-[0.08em] text-[#FBF7F1]/60 uppercase mb-1.5 block font-semibold">
            Sesi coaching
          </span>
          <select
            value={activeSessionId}
            onChange={(e) => {
              router.push(`/admin/coaching?when=${sessionTab}&session=${e.target.value}`);
            }}
            className="bg-[#FBF7F1]/10 border-0 rounded-lg px-2.5 py-2 font-sans text-xs sm:text-sm text-[#FBF7F1] w-full box-border appearance-auto focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#17151F] text-[#FBF7F1]">
                {s.title} · {s.session_date} {s.venue_name ? `· ${s.venue_name}` : ""}
              </option>
            ))}
          </select>
        </div>

        {activeSession && (
          <div>
            <span className="text-[11px] tracking-[0.08em] text-[#FBF7F1]/60 uppercase mb-1.5 block font-semibold">
              Status sesi
            </span>
            <SessionStatusSwitch sessionId={activeSession.id} current={sessionTab} compact />
          </div>
        )}

        {/* Row 2: Coach filter & Progres Penilaian in 2-column layout */}
        <div className="grid grid-cols-2 gap-2.5 items-end">
          <div>
            <span className="text-[11px] tracking-[0.08em] text-[#FBF7F1]/60 uppercase mb-1 block font-semibold">
              Coach
            </span>
            <select
              value={selectedCoachFilter}
              onChange={(e) => onCoachFilterChange(e.target.value)}
              className="bg-[#FBF7F1]/10 border-0 rounded-lg px-2 py-1.5 font-sans text-xs text-[#FBF7F1] w-full box-border appearance-auto focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
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
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#FBF7F1]/60 font-semibold mb-1">
              <span>Progres</span>
              <span className="text-[#FBF7F1] font-bold">
                {sessionData?.progress.rated ?? 0} / {sessionData?.progress.total ?? 0}
              </span>
            </div>
            <div
              role="img"
              aria-label={`${sessionData?.progress.rated ?? 0} dari ${sessionData?.progress.total ?? 0} pemain dinilai`}
              className="h-2 rounded-full bg-[#FBF7F1]/12 overflow-hidden my-1"
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
          </div>
        </div>
      </div>
    </>
  );
}

const TAB_LABELS: Record<SessionTab, string> = { draft: "Draft", berjalan: "Berjalan", selesai: "Selesai" };

/**
 * The tab a status change is heading to. Module scope, not a ref: the action's redirect remounts
 * the page (Next's RedirectBoundary), so the switch that arrives is a fresh instance.
 */
let movingTo: SessionTab | null = null;

/**
 * Draft / Berjalan / Selesai for the session on screen (admin and coach). The pick shows at once
 * while the save and the new tab load behind the top bar (the action redirects there, inside the
 * same transition); on an error it falls back to the saved status.
 */
function SessionStatusSwitch({ sessionId, current, compact = false }: { sessionId: string; current: SessionTab; compact?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(current);
  const [asking, setAsking] = useState<SessionTab | null>(null);
  useTopLoaderWhile(pending);

  // the page has arrived on the picked tab (desktop and mobile both mount; the first one toasts)
  useEffect(() => {
    if (movingTo !== current) return;
    movingTo = null;
    toast.success(`Sesi dipindah ke ${TAB_LABELS[current]}`);
  }, [current]);

  const move = (tab: SessionTab) => {
    setAsking(null);
    movingTo = tab;
    startTransition(async () => {
      setShown(tab);
      const res = await setCoachingSessionStatusAction(sessionId, TAB_STATUS[tab]);
      // only an error comes back; success redirects
      if (res?.error) {
        movingTo = null;
        toast.error(res.error);
      }
    });
  };

  return (
    <div role="radiogroup" aria-label="Status sesi" className={`flex gap-1 p-1 rounded-lg bg-[#FBF7F1]/10 ${compact ? "w-full" : "min-h-11"}`}>
      {SESSION_TABS.map((t) => {
        const on = shown === t;
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={current === t}
            disabled={pending}
            data-loading={(pending && on) || undefined}
            onClick={() => t !== shown && setAsking(t)}
            className={`flex-1 border-0 rounded-md font-sans font-bold whitespace-nowrap cursor-pointer transition-colors disabled:cursor-wait ${
              compact ? "min-h-9 px-2 text-xs" : "px-3.5 text-sm"
            } ${on ? "bg-[#FFD43B] text-[#17151F]" : "bg-transparent text-[#FBF7F1]/75 hover:text-[#FBF7F1] hover:bg-[#FBF7F1]/8"}`}
          >
            {TAB_LABELS[t]}
          </button>
        );
      })}
      {asking && (
        <ConfirmDialog
          title="Ubah status sesi"
          message={
            <>
              Pindahkan sesi ini dari <b>{TAB_LABELS[current]}</b> ke <b>{TAB_LABELS[asking]}</b>?
              {asking === "selesai" && " Sesi yang selesai tidak lagi tampil sebagai Sesi berikutnya di profil pemain."}
            </>
          }
          confirmLabel={`Ya, pindah ke ${TAB_LABELS[asking]}`}
          onConfirm={() => move(asking)}
          onCancel={() => setAsking(null)}
        />
      )}
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
