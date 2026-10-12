"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Coach, CoachingSkill, Player, Venue } from "@/lib/database.types";

import {
  createCoachingSessionAction,
  updateCoachingSessionAction,
  deleteCoachingSessionAction,
} from "../session-actions";
import { SessionDetailsEditor } from "./SessionDetailsEditor";
import { SessionGroupsEditor, type FormGroupItem } from "./SessionGroupsEditor";
import { SessionPlayersTable } from "./SessionPlayersTable";
import { SessionSkillsSelector } from "./SessionSkillsSelector";
import { PlayerPickerModal } from "./PlayerPickerModal";
import { toast } from "@/components/ui/Toast";

const COLOR_PRESETS = [
  "#FFD43B", "#2563EB", "#FF5A3C", "#2F9E5C", "#A855F7", "#EC4899", "#06B6D4", "#F97316",
];

export interface ExistingGroupData {
  id: string;
  name: string;
  color: string;
  coach_id: string | null;
}

export interface ExistingSessionPlayerData {
  player_id: string;
  group_id: string | null;
}

export function SessionFormClient({
  sessionId,
  initialTitle = "",
  initialDate = new Date().toISOString().split("T")[0],
  initialVenueName = "",
  initialVenueId = "",
  initialEventId = "",
  initialStatus = "draft",
  initialGroups = [],
  initialSessionPlayerIds = [],
  initialPlayerAssignments = [],
  initialSkillIds = [],
  venues,
  events,
  coaches,
  skills,
  allPlayers,
}: {
  sessionId?: string;
  initialTitle?: string;
  initialDate?: string;
  initialVenueName?: string;
  initialVenueId?: string;
  initialEventId?: string;
  initialStatus?: "draft" | "active" | "finished";
  initialGroups?: ExistingGroupData[];
  initialSessionPlayerIds?: string[];
  initialPlayerAssignments?: ExistingSessionPlayerData[];
  initialSkillIds?: string[];
  venues: Venue[];
  events: Array<{ id: string; title: string; event_date?: string | null; venue_id?: string | null }>;
  coaches: Coach[];
  skills: CoachingSkill[];
  allPlayers: Player[];
}) {
  const router = useRouter();
  const isEdit = Boolean(sessionId);

  // 1. Session Details State
  const [title, setTitle] = useState(initialTitle);
  const [sessionDate, setSessionDate] = useState(initialDate);
  const [venueName, setVenueName] = useState(initialVenueName);
  const [venueId, setVenueId] = useState(initialVenueId);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [status, setStatus] = useState<"draft" | "active" | "finished">(initialStatus);

  // 2. Groups State
  const [groups, setGroups] = useState<
    Array<{ id?: string; tempId: string; name: string; color: string; coachId: string }>
  >(() => {
    if (initialGroups.length > 0) {
      return initialGroups.map((g) => ({
        id: g.id,
        tempId: g.id,
        name: g.name,
        color: g.color || "#FFD43B",
        coachId: g.coach_id || coaches[0]?.id || "",
      }));
    }
    return [
      { tempId: "grp_1", name: "Grup 1", color: "#FFD43B", coachId: coaches[0]?.id || "" },
      { tempId: "grp_2", name: "Grup 2", color: "#2563EB", coachId: coaches[1]?.id || coaches[0]?.id || "" },
    ];
  });

  // 3. Player Assignments State: Map<playerId, groupId | null>
  const [playerGroupMap, setPlayerGroupMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (initialPlayerAssignments.length > 0) {
      for (const pa of initialPlayerAssignments) {
        if (pa.group_id) map[pa.player_id] = pa.group_id;
      }
    }
    return map;
  });

  // Assigned player IDs in this session
  const [sessionPlayerIds, setSessionPlayerIds] = useState<string[]>(() => {
    if (initialSessionPlayerIds.length > 0) return initialSessionPlayerIds;
    return [];
  });

  // 4. Default skills chips state (Exact Match to Main Coaching)
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(() => {
    if (initialSkillIds.length > 0) return initialSkillIds;
    // Default to first 8 skills
    return skills.slice(0, 8).map((s) => s.id);
  });

  // UI state
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);



  // Handle Event link change
  const handleEventSelect = (evId: string) => {
    setSelectedEventId(evId);
    if (!evId) return;
    const ev = events.find((e) => e.id === evId);
    if (ev) {
      if (!title) setTitle(`Coaching Clinic · ${ev.title}`);
      if (ev.event_date) setSessionDate(ev.event_date);
      if (ev.venue_id) {
        setVenueId(ev.venue_id);
        const v = venues.find((v) => v.id === ev.venue_id);
        if (v) setVenueName(v.name);
      }
    }
  };

  // Group helpers
  const handleAddGroup = () => {
    const nextIdx = groups.length + 1;
    const col = COLOR_PRESETS[(nextIdx - 1) % COLOR_PRESETS.length];
    const coachForNewGroup = coaches[(nextIdx - 1) % coaches.length]?.id || coaches[0]?.id || "";
    setGroups([
      ...groups,
      {
        tempId: `grp_${Date.now()}`,
        name: `Grup ${nextIdx}`,
        color: col,
        coachId: coachForNewGroup,
      },
    ]);
  };

  const handleRemoveGroup = (idx: number) => {
    if (groups.length <= 1) return;
    const grpToRemove = groups[idx];
    setGroups(groups.filter((_, i) => i !== idx));

    // Reassign players in removed group to first group
    const remainingFirstGroup = groups.find((_, i) => i !== idx);
    if (remainingFirstGroup) {
      const nextMap = { ...playerGroupMap };
      for (const pid of sessionPlayerIds) {
        if (nextMap[pid] === (grpToRemove.id || grpToRemove.tempId)) {
          nextMap[pid] = remainingFirstGroup.id || remainingFirstGroup.tempId;
        }
      }
      setPlayerGroupMap(nextMap);
    }
  };

  // Player assignment helpers
  const handleAddPlayer = (pid: string) => {
    if (!pid || sessionPlayerIds.includes(pid)) return;
    const firstGroupId = groups[0]?.id || groups[0]?.tempId || "";
    setSessionPlayerIds([...sessionPlayerIds, pid]);
    setPlayerGroupMap({ ...playerGroupMap, [pid]: firstGroupId });
  };

  const handleRemovePlayer = (pid: string) => {
    setSessionPlayerIds(sessionPlayerIds.filter((id) => id !== pid));
    const nextMap = { ...playerGroupMap };
    delete nextMap[pid];
    setPlayerGroupMap(nextMap);
  };

  const handleTogglePlayer = (pid: string) => {
    if (sessionPlayerIds.includes(pid)) {
      handleRemovePlayer(pid);
    } else {
      handleAddPlayer(pid);
    }
  };

  const handleSelectAllShown = (pids: string[]) => {
    const toAdd = pids.filter((id) => !sessionPlayerIds.includes(id));
    if (toAdd.length === 0) return;
    const firstGroupId = groups[0]?.id || groups[0]?.tempId || "";
    const nextMap = { ...playerGroupMap };
    toAdd.forEach((id) => {
      nextMap[id] = firstGroupId;
    });
    setSessionPlayerIds([...sessionPlayerIds, ...toAdd]);
    setPlayerGroupMap(nextMap);
  };

  const handleClearAllPlayers = () => {
    setSessionPlayerIds([]);
    setPlayerGroupMap({});
  };

  const handleAssignPlayerGroup = (pid: string, targetGroupId: string) => {
    setPlayerGroupMap({ ...playerGroupMap, [pid]: targetGroupId });
  };

  const handleDistributeEvenly = () => {
    if (groups.length === 0 || sessionPlayerIds.length === 0) return;
    const nextMap = { ...playerGroupMap };
    sessionPlayerIds.forEach((pid, idx) => {
      const targetGroup = groups[idx % groups.length];
      nextMap[pid] = targetGroup.id || targetGroup.tempId;
    });
    setPlayerGroupMap(nextMap);
  };

  // Skill toggle helpers
  const handleSkillToggle = (id: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectPopularSkills = () => {
    setSelectedSkillIds(skills.slice(0, 8).map((s) => s.id));
  };

  const handleSelectAllSkills = () => {
    setSelectedSkillIds(skills.map((s) => s.id));
  };

  const handleClearSkills = () => {
    setSelectedSkillIds([]);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !sessionDate) {
      setError("Judul sesi dan tanggal wajib diisi.");
      toast.error("Judul sesi dan tanggal wajib diisi.");
      return;
    }
    if (groups.length === 0) {
      setError("Minimal harus ada 1 grup coaching.");
      toast.error("Minimal harus ada 1 grup coaching.");
      return;
    }

    startTransition(async () => {
      try {
        if (isEdit && sessionId) {
          await updateCoachingSessionAction({
            sessionId,
            title: title.trim(),
            sessionDate,
            venueId: venueId || null,
            venueName: venueName.trim(),
            eventId: selectedEventId || null,
            defaultSkillIds: selectedSkillIds,
            status,
            groups: groups.map((g) => ({
              id: g.id,
              name: g.name.trim(),
              color: g.color,
              coachId: g.coachId || null,
            })),
            playerAssignments: sessionPlayerIds.map((pid) => ({
              playerId: pid,
              groupId: playerGroupMap[pid] || null,
            })),
          });
          toast.success(`Sesi "${title.trim()}" berhasil diperbarui`);
          router.push(`/admin/coaching?session=${sessionId}`);
        } else {
          const res = await createCoachingSessionAction({
            title: title.trim(),
            sessionDate,
            venueId: venueId || null,
            venueName: venueName.trim(),
            eventId: selectedEventId || null,
            defaultSkillIds: selectedSkillIds,
            groups: groups.map((g) => ({
              name: g.name.trim(),
              color: g.color,
              coachId: g.coachId || null,
            })),
            playerIds: sessionPlayerIds,
          });
          toast.success(`Sesi "${title.trim()}" berhasil dibuat`);
          router.push(`/admin/coaching?session=${res.sessionId}`);
        }
        router.refresh();
      } catch (err: any) {
        setError(err.message || "Gagal menyimpan sesi");
        toast.error(err.message || "Gagal menyimpan sesi");
      }
    });
  };

  const handleDeleteSession = () => {
    if (!sessionId) return;
    if (!confirm(`Hapus sesi "${title}"? Semua data grup dan penilaian di sesi ini akan dihapus.`)) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteCoachingSessionAction(sessionId);
        toast.success(`Sesi "${title}" berhasil dihapus`);
        router.push("/admin/coaching");
        router.refresh();
      } catch (err: any) {
        setError(err.message || "Gagal menghapus sesi");
        toast.error(err.message || "Gagal menghapus sesi");
      }
    });
  };

  // Players data
  const sessionPlayersList = useMemo(() => {
    return allPlayers.filter((p) => sessionPlayerIds.includes(p.id));
  }, [allPlayers, sessionPlayerIds]);

  const filteredSessionPlayers = useMemo(() => {
    if (!playerSearchQuery.trim()) return sessionPlayersList;
    const q = playerSearchQuery.toLowerCase().trim();
    return sessionPlayersList.filter((p) => p.name.toLowerCase().includes(q));
  }, [sessionPlayersList, playerSearchQuery]);

  const unassignedMasterPlayers = useMemo(() => {
    return allPlayers.filter((p) => !sessionPlayerIds.includes(p.id));
  }, [allPlayers, sessionPlayerIds]);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 text-[#FBF7F1] w-full pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#FBF7F1]/10">
        <div>
          <Link
            href={sessionId ? `/admin/coaching?session=${sessionId}` : "/admin/coaching"}
            className="text-sm text-[#FBF7F1]/70 hover:text-[#FFD43B] no-underline inline-flex items-center gap-1.5 mb-2 transition-colors"
          >
            ← Kembali ke Catatan Coaching
          </Link>
          <h1 className="font-display font-bold text-2xl lg:text-[28px] m-0 leading-tight">
            {isEdit ? "Edit Sesi Coaching" : "Buat Sesi Coaching Baru"}
          </h1>
          <p className="m-0 mt-1.5 text-sm text-[#FBF7F1]/70">
            Atur informasi sesi, pembagian grup &amp; coach, daftar pemain yang ikut, serta teknik default yang dinilai.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isEdit && (
            <button
              type="button"
              onClick={handleDeleteSession}
              disabled={isPending}
              className="border-0 rounded-lg min-h-11 px-4 font-sans font-bold text-xs bg-transparent text-[#FF5A3C] hover:bg-[#FF5A3C]/10 transition-all"
            >
              Hapus Sesi
            </button>
          )}
          <Link
            href={sessionId ? `/admin/coaching?session=${sessionId}` : "/admin/coaching"}
            className="border-0 rounded-lg min-h-11 px-4 font-sans font-bold text-sm bg-[#FBF7F1]/10 text-[#FBF7F1] hover:bg-[#FBF7F1]/15 transition-all inline-flex items-center justify-center no-underline"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="border-0 rounded-lg min-h-11 px-6 font-sans font-bold text-sm bg-[#FF5A3C] text-[#17151F] hover:bg-[#FF5A3C]/90 transition-all shadow-md disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {isPending ? "Menyimpan..." : "Simpan Sesi"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-coral/20 border border-coral text-coral-soft px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* SECTION 1: DETAIL SESI */}
      <SessionDetailsEditor
        title={title}
        sessionDate={sessionDate}
        status={status}
        venueId={venueId}
        venueName={venueName}
        selectedEventId={selectedEventId}
        venues={venues}
        events={events}
        onTitleChange={setTitle}
        onSessionDateChange={setSessionDate}
        onStatusChange={setStatus}
        onVenueIdChange={setVenueId}
        onVenueNameChange={setVenueName}
        onEventSelect={handleEventSelect}
      />

      {/* SECTION 2: PEMBAGIAN GRUP & COACH */}
      <SessionGroupsEditor
        groups={groups}
        coaches={coaches}
        sessionPlayerIds={sessionPlayerIds}
        playerGroupMap={playerGroupMap}
        colorPresets={COLOR_PRESETS}
        onAddGroup={handleAddGroup}
        onRemoveGroup={handleRemoveGroup}
        onUpdateGroup={(idx, patch) => {
          const newGroups = [...groups];
          newGroups[idx] = { ...newGroups[idx], ...patch };
          setGroups(newGroups);
        }}
      />

      {/* SECTION 3: DAFTAR PEMAIN & EDIT PLAYER COACH */}
      <SessionPlayersTable
        groups={groups}
        coaches={coaches}
        sessionPlayersList={sessionPlayersList}
        filteredSessionPlayers={filteredSessionPlayers}
        unassignedMasterPlayers={unassignedMasterPlayers}
        playerGroupMap={playerGroupMap}
        playerSearchQuery={playerSearchQuery}
        onSearchQueryChange={setPlayerSearchQuery}
        onOpenAddModal={() => setShowAddPlayerModal(true)}
        onAddPlayer={handleAddPlayer}
        onRemovePlayer={handleRemovePlayer}
        onAssignPlayerGroup={handleAssignPlayerGroup}
        onDistributeEvenly={handleDistributeEvenly}
      />

      {/* SECTION 4: PILIH TEKNIK DEFAULT SESI INI */}
      <SessionSkillsSelector
        skills={skills}
        selectedSkillIds={selectedSkillIds}
        onToggleSkill={handleSkillToggle}
        onSelectPopular={handleSelectPopularSkills}
        onSelectAll={handleSelectAllSkills}
        onClear={handleClearSkills}
      />

      {/* Player Picker Modal (Event Participant Input Pattern) */}
      <PlayerPickerModal
        isOpen={showAddPlayerModal}
        onClose={() => setShowAddPlayerModal(false)}
        allPlayers={allPlayers}
        sessionPlayerIds={sessionPlayerIds}
        onTogglePlayer={handleTogglePlayer}
        onSelectAllShown={handleSelectAllShown}
        onClearAll={handleClearAllPlayers}
      />
    </form>
  );
}
