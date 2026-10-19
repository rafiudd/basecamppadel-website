"use client";

import { unwrap } from "@/lib/actionState";
import { useState, useEffect, useTransition, useMemo } from "react";
import { useRouter } from "nextjs-toploader/app";
import { useTopLoaderWhile } from "@/components/TopLoader";
import type {
  Coach,
  CoachingSkill,
  Player,
  Venue,
} from "@/lib/database.types";
import type {
  CoachingSessionSummary,
  SessionFullData,
} from "@/lib/coaching-db";
import {
  computePlayerLevel,
  type SessionTab,
} from "@/lib/coaching";
import { generateRekapClinicExcel } from "@/lib/coaching-excel";
import {
  saveAssessmentDraftAction,
  submitAssessmentAction,
  publishAllSessionDraftsAction,
} from "./actions";
import { MasterTeknikModal } from "./components/MasterTeknikModal";
import { CreateSessionModal } from "./components/CreateSessionModal";
import { OverrideLevelModal } from "./components/OverrideLevelModal";
import { ImportRekapModal } from "./components/ImportRekapModal";
import { CoachingHeader } from "./components/CoachingHeader";
import { PlayerListTable } from "./components/PlayerListTable";
import { AssessmentEditor } from "./components/AssessmentEditor";
import { toast } from "@/components/ui/Toast";

export function CoachingClient({
  sessions,
  sessionTab,
  sessionCounts,
  sessionData,
  activeSessionId,
  allSkills,
  allCoaches,
  allPlayers,
  venues,
  events,
  isAdmin,
}: {
  sessions: CoachingSessionSummary[];
  sessionTab: SessionTab;
  sessionCounts: Record<SessionTab, number>;
  sessionData: SessionFullData | null;
  activeSessionId: string;
  allSkills: CoachingSkill[];
  allCoaches: Coach[];
  allPlayers: Player[];
  venues: Venue[];
  events: Array<{ id: string; title: string; event_date?: string | null; venue_id?: string | null }>;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [selectedCoachFilter, setSelectedCoachFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"belum" | "selesai">("belum");

  // Active player selection — by id (not index) so it survives the list reshuffling
  // when a status change moves a player between the "belum"/"selesai" tabs.
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showAssessment, setShowAssessment] = useState(false);

  // Modals
  const [showMasterTeknik, setShowMasterTeknik] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [showImportRekap, setShowImportRekap] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overridePlayerTarget, setOverridePlayerTarget] = useState<Player | null>(null);

  // Form State for current assessment editor
  const [scores, setScores] = useState<Record<string, number>>({});
  const [activeSkillIds, setActiveSkillIds] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState("");
  const [nextPractice, setNextPractice] = useState("");
  const [publishedToPlayer, setPublishedToPlayer] = useState(true);

  // UI state
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<string>("Tersimpan otomatis");
  const [isPublishingAll, setIsPublishingAll] = useState(false);
  /** Which footer button is running, so only that one shows the spinner. */
  const [busyAction, setBusyAction] = useState<"draft" | "submit" | null>(null);
  useTopLoaderWhile(isPending || busyAction !== null || isPublishingAll);

  // Players matching the coach filter + search, before the belum/selesai tab split —
  // used to compute accurate counts for both tabs regardless of which one is active.
  const baseFilteredPlayers = useMemo(() => {
    if (!sessionData) return [];
    return sessionData.players.filter((pItem) => {
      if (selectedCoachFilter !== "all" && pItem.group?.coach_id !== selectedCoachFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!pItem.player.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [sessionData, selectedCoachFilter, searchQuery]);

  const belumCount = useMemo(() => baseFilteredPlayers.filter((p) => p.status !== "submitted").length, [baseFilteredPlayers]);
  const selesaiCount = useMemo(() => baseFilteredPlayers.filter((p) => p.status === "submitted").length, [baseFilteredPlayers]);

  // Filtered players list for the active tab
  const filteredPlayers = useMemo(() => {
    return baseFilteredPlayers.filter((p) => (statusFilter === "selesai" ? p.status === "submitted" : p.status !== "submitted"));
  }, [baseFilteredPlayers, statusFilter]);

  const activePlayerIndex = filteredPlayers.findIndex((p) => p.player.id === selectedPlayerId);
  // If the selected player vanished from the active tab (search/tab changed underneath the
  // modal, or it was just submitted and handleSubmitAndNext had nowhere to go), the render
  // below is gated on currentPlayerItem so the modal simply won't show — nothing left to do here.
  const currentPlayerItem = activePlayerIndex >= 0 ? filteredPlayers[activePlayerIndex] : null;

  // Initialize/sync editor form state when active player changes
  useEffect(() => {
    if (currentPlayerItem) {
      const asm = currentPlayerItem.assessment;
      const initialScores = (asm?.scores as Record<string, number>) || {};
      setScores(initialScores);

      const initialSkills =
        asm?.active_skill_ids && asm.active_skill_ids.length > 0
          ? asm.active_skill_ids
          : sessionData?.session.default_skill_ids && sessionData.session.default_skill_ids.length > 0
          ? sessionData.session.default_skill_ids
          : allSkills.slice(0, 8).map((s) => s.id);

      setActiveSkillIds(initialSkills);
      setEvaluation(asm?.evaluation || "");
      setNextPractice(asm?.next_practice || "");
      setPublishedToPlayer(asm ? asm.published_to_player : true);
      setSaveStatus(asm?.updated_at ? "Tersimpan otomatis" : "Belum disimpan");
    }
  }, [currentPlayerItem?.player.id, sessionData]);

  // Handle Score Toggle / Click (scale 1 - 5, step 0.5)
  const handleScoreClick = (skillId: string, val: number) => {
    const newScores = { ...scores };
    if (newScores[skillId] === val) {
      delete newScores[skillId];
    } else {
      newScores[skillId] = val;
    }
    setScores(newScores);
    triggerAutoSave(newScores, activeSkillIds, evaluation, nextPractice, publishedToPlayer);
  };

  // Toggle active skills chip
  const handleToggleSkillChip = (skillId: string) => {
    const newSkillIds = activeSkillIds.includes(skillId)
      ? activeSkillIds.filter((id) => id !== skillId)
      : [...activeSkillIds, skillId];
    setActiveSkillIds(newSkillIds);
    triggerAutoSave(scores, newSkillIds, evaluation, nextPractice, publishedToPlayer);
  };

  // Debounced Auto-save
  const triggerAutoSave = (
    s: Record<string, number>,
    aSkills: string[],
    ev: string,
    np: string,
    pub: boolean
  ) => {
    if (!currentPlayerItem || !sessionData) return;
    setSaveStatus("Menyimpan draft...");

    startTransition(async () => {
      try {
        unwrap(await saveAssessmentDraftAction({
          sessionId: sessionData.session.id,
          playerId: currentPlayerItem.player.id,
          coachId: currentPlayerItem.group?.coach_id || null,
          groupId: currentPlayerItem.group?.id || null,
          scores: s,
          activeSkillIds: aSkills,
          evaluation: ev,
          nextPractice: np,
          publishedToPlayer: pub,
        }));
        setSaveStatus("Tersimpan otomatis");
      } catch {
        setSaveStatus("Gagal menyimpan otomatis");
      }
    });
  };

  // Manual Simpan Draft
  const handleSaveDraft = () => {
    if (!currentPlayerItem || !sessionData) return;
    setBusyAction("draft");
    startTransition(async () => {
      setSaveStatus("Menyimpan draft...");
      try {
        unwrap(await saveAssessmentDraftAction({
          sessionId: sessionData.session.id,
          playerId: currentPlayerItem.player.id,
          coachId: currentPlayerItem.group?.coach_id || null,
          groupId: currentPlayerItem.group?.id || null,
          scores,
          activeSkillIds,
          evaluation,
          nextPractice,
          publishedToPlayer,
        }));
        setSaveStatus("Draft tersimpan");
        toast.success(`Draft penilaian ${currentPlayerItem.player.name} tersimpan`);
        router.refresh();
      } catch (err: any) {
        setSaveStatus("Gagal menyimpan draft");
        toast.error(err?.message || "Gagal menyimpan draft");
      } finally {
        setBusyAction(null);
      }
    });
  };

  // Simpan & Kirim (Submit) lalu lanjut ke pemain berikutnya
  const handleSubmitAndNext = () => {
    if (!currentPlayerItem || !sessionData) return;
    // Submitting moves this player out of the "belum" tab, so grab the next id now —
    // after refresh the list reshuffles and this player's own index won't mean "next" anymore.
    const nextPlayerId = activePlayerIndex < filteredPlayers.length - 1 ? filteredPlayers[activePlayerIndex + 1].player.id : null;
    setBusyAction("submit");
    startTransition(async () => {
      setSaveStatus("Mengirim...");
      try {
        unwrap(await submitAssessmentAction({
          sessionId: sessionData.session.id,
          playerId: currentPlayerItem.player.id,
          coachId: currentPlayerItem.group?.coach_id || null,
          groupId: currentPlayerItem.group?.id || null,
          scores,
          activeSkillIds,
          evaluation,
          nextPractice,
          publishedToPlayer,
        }));
        setSaveStatus("Terkirim");
        toast.success(`Penilaian ${currentPlayerItem.player.name} berhasil disimpan & dikirim`);

        if (nextPlayerId) {
          setSelectedPlayerId(nextPlayerId);
        } else {
          setShowAssessment(false);
        }
        router.refresh();
      } catch (err: any) {
        setSaveStatus("Gagal mengirim");
        toast.error(err?.message || "Gagal mengirim penilaian");
      } finally {
        setBusyAction(null);
      }
    });
  };

  // Kirim Semua ke Pemain
  const handlePublishAll = async () => {
    if (!sessionData) return;
    if (!confirm("Kirim semua penilaian draft dalam sesi ini ke pemain?")) return;
    setIsPublishingAll(true);
    try {
      unwrap(await publishAllSessionDraftsAction(sessionData.session.id));
      toast.success("Semua penilaian draft berhasil dikirim ke pemain");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengirim penilaian ke pemain");
    } finally {
      setIsPublishingAll(false);
    }
  };

  // Export Rekap (.xlsx)
  const handleExportXlsx = () => {
    if (!sessionData) return;
    try {
      const buffer = generateRekapClinicExcel({
        sessionTitle: sessionData.session.title,
        sessionDate: sessionData.session.session_date,
        venueName: sessionData.session.venue_name,
        skills: sessionData.skills,
        rows: sessionData.players.map((pItem) => ({
          playerName: pItem.player.name,
          groupName: pItem.group?.name || "",
          coachName: pItem.coach?.name || "",
          scores: (pItem.assessment?.scores as Record<string, number>) || {},
          evaluation: pItem.assessment?.evaluation || "",
          nextPractice: pItem.assessment?.next_practice || "",
          computedLevel: pItem.computedLevel.level,
          overrideLevel: pItem.assessment?.override_level || "",
          overrideReason: pItem.assessment?.override_reason || "",
        })),
      });

      const blob = new Blob([buffer as unknown as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Rekap-Clinic-${sessionData.session.session_date}-${sessionData.session.title.replace(/\s+/g, "_")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Rekap clinic (.xlsx) berhasil diunduh");
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengunduh rekap");
    }
  };

  // Group skills by Type ('teknik' vs 'in_game') and Category
  const techniqueCategories = useMemo(() => {
    const map = new Map<string, CoachingSkill[]>();
    allSkills
      .filter((s) => s.type === "teknik")
      .forEach((s) => {
        if (!map.has(s.category)) map.set(s.category, []);
        map.get(s.category)!.push(s);
      });
    return Array.from(map.entries());
  }, [allSkills]);

  const ingameCategories = useMemo(() => {
    const map = new Map<string, CoachingSkill[]>();
    allSkills
      .filter((s) => s.type === "in_game")
      .forEach((s) => {
        if (!map.has(s.category)) map.set(s.category, []);
        map.get(s.category)!.push(s);
      });
    return Array.from(map.entries());
  }, [allSkills]);

  const chosenTeknikSkills = useMemo(() => {
    return allSkills.filter((s) => s.type === "teknik" && activeSkillIds.includes(s.id));
  }, [allSkills, activeSkillIds]);

  const chosenIngameSkills = useMemo(() => {
    return allSkills.filter((s) => s.type === "in_game" && activeSkillIds.includes(s.id));
  }, [allSkills, activeSkillIds]);

  const currentComputedLevel = useMemo(() => {
    return computePlayerLevel(scores, {
      currentLevel: currentPlayerItem?.player.level,
      overrideLevel: currentPlayerItem?.assessment?.override_level,
      overrideReason: currentPlayerItem?.assessment?.override_reason,
    });
  }, [scores, currentPlayerItem]);

  return (
    <div className="flex flex-col gap-5 text-[#FBF7F1]">
      <CoachingHeader
        sessions={sessions}
        sessionTab={sessionTab}
        sessionCounts={sessionCounts}
        sessionData={sessionData}
        activeSessionId={activeSessionId}
        allCoaches={allCoaches}
        selectedCoachFilter={selectedCoachFilter}
        isAdmin={isAdmin}
        isPublishingAll={isPublishingAll}
        onCoachFilterChange={setSelectedCoachFilter}
        onOpenImportRekap={() => setShowImportRekap(true)}
        onExportXlsx={handleExportXlsx}
        onPublishAll={handlePublishAll}
      />

      {sessionData ? (
        <>
          <PlayerListTable
            filteredPlayers={filteredPlayers}
            belumCount={belumCount}
            selesaiCount={selesaiCount}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            onSearchChange={setSearchQuery}
            onStatusFilterChange={setStatusFilter}
            onSelectPlayer={(index) => {
              setSelectedPlayerId(filteredPlayers[index].player.id);
              setShowAssessment(true);
            }}
          />

          {showAssessment && currentPlayerItem && (
            <AssessmentEditor
              currentPlayerItem={currentPlayerItem}
              currentComputedLevel={currentComputedLevel}
              scores={scores}
              activeSkillIds={activeSkillIds}
              allSkills={allSkills}
              chosenTeknikSkills={chosenTeknikSkills}
              chosenIngameSkills={chosenIngameSkills}
              techniqueCategories={techniqueCategories}
              ingameCategories={ingameCategories}
              evaluation={evaluation}
              nextPractice={nextPractice}
              publishedToPlayer={publishedToPlayer}
              saveStatus={saveStatus}
              isPending={isPending}
              busyAction={busyAction}
              isAdmin={isAdmin}
              positionLabel={`pemain ${activePlayerIndex + 1} dari ${filteredPlayers.length}`}
              hasPrev={activePlayerIndex > 0}
              hasNext={activePlayerIndex < filteredPlayers.length - 1}
              onScoreClick={handleScoreClick}
              onToggleSkillChip={handleToggleSkillChip}
              onEvaluationChange={(val) => {
                setEvaluation(val);
                triggerAutoSave(scores, activeSkillIds, val, nextPractice, publishedToPlayer);
              }}
              onNextPracticeChange={(val) => {
                setNextPractice(val);
                triggerAutoSave(scores, activeSkillIds, evaluation, val, publishedToPlayer);
              }}
              onGenerated={(ev, np) => {
                // one atomic update + one save with both new values — setting them via the two
                // onChange handlers above back-to-back would race (each closes over the other's
                // pre-AI value) and whichever autosave lands last would silently revert the other field
                setEvaluation(ev);
                setNextPractice(np);
                triggerAutoSave(scores, activeSkillIds, ev, np, publishedToPlayer);
              }}
              onPublishedChange={(val) => {
                setPublishedToPlayer(val);
                triggerAutoSave(scores, activeSkillIds, evaluation, nextPractice, val);
              }}
              onSaveDraft={handleSaveDraft}
              onSubmitAndNext={handleSubmitAndNext}
              onOpenOverrideModal={() => {
                if (currentPlayerItem) {
                  setOverridePlayerTarget(currentPlayerItem.player);
                  setShowOverrideModal(true);
                }
              }}
              onClose={() => setShowAssessment(false)}
              onPrev={() => {
                if (activePlayerIndex > 0) setSelectedPlayerId(filteredPlayers[activePlayerIndex - 1].player.id);
              }}
              onNext={() => {
                if (activePlayerIndex < filteredPlayers.length - 1) setSelectedPlayerId(filteredPlayers[activePlayerIndex + 1].player.id);
              }}
            />
          )}
        </>
      ) : (
        <p className="m-0 bg-[#221F30] rounded-2xl p-6 text-sm text-[#FBF7F1]/70 border border-[#FBF7F1]/5">
          {EMPTY_TAB_TEXT[sessionTab]}
        </p>
      )}

      {showMasterTeknik && (
        <MasterTeknikModal
          skills={allSkills}
          onClose={() => setShowMasterTeknik(false)}
        />
      )}

      {showCreateSession && (
        <CreateSessionModal
          venues={venues}
          coaches={allCoaches}
          skills={allSkills}
          events={events}
          onClose={() => setShowCreateSession(false)}
          onCreated={(newSessionId) => {
            router.push(`/admin/coaching?session=${newSessionId}`);
            router.refresh();
          }}
        />
      )}

      {showImportRekap && sessionData && (
        <ImportRekapModal
          sessionId={sessionData.session.id}
          skills={sessionData.skills}
          players={allPlayers}
          onClose={() => setShowImportRekap(false)}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      {showOverrideModal && overridePlayerTarget && (
        <OverrideLevelModal
          playerId={overridePlayerTarget.id}
          playerName={overridePlayerTarget.name}
          sessionId={sessionData?.session.id}
          currentLevel={
            overridePlayerTarget.level as any || "Beginner"
          }
          currentReason={overridePlayerTarget.level_override_reason || undefined}
          onClose={() => {
            setShowOverrideModal(false);
            setOverridePlayerTarget(null);
          }}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

const EMPTY_TAB_TEXT: Record<SessionTab, string> = {
  draft: "Belum ada sesi draft. Buat sesi baru untuk mulai persiapan.",
  berjalan: "Belum ada sesi yang sedang berjalan. Ubah status sesi ke Aktif, atau lihat tab lain.",
  selesai: "Belum ada sesi yang selesai.",
};
