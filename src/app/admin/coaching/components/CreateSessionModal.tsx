"use client";

import { unwrap } from "@/lib/actionState";
import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import type { Coach, CoachingSkill, Venue } from "@/lib/database.types";
import { createCoachingSessionAction } from "../session-actions";
import { toast } from "@/components/ui/Toast";

export function CreateSessionModal({
  venues,
  coaches,
  skills,
  events,
  onClose,
  onCreated,
}: {
  venues: Venue[];
  coaches: Coach[];
  skills: CoachingSkill[];
  events: Array<{ id: string; title: string; event_date?: string | null; venue_id?: string | null }>;
  onClose: () => void;
  onCreated: (sessionId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [venueName, setVenueName] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [groups, setGroups] = useState([
    { name: "Grup 1", color: "#FFD43B", coachId: coaches[0]?.id || "" },
    { name: "Grup 2", color: "#2563EB", coachId: coaches[1]?.id || "" },
  ]);

  // Default active skills (first 8 or so)
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(
    skills.slice(0, 8).map((s) => s.id)
  );

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleEventSelect = (evId: string) => {
    setSelectedEventId(evId);
    if (!evId) return;
    const ev = events.find((e) => e.id === evId);
    if (ev) {
      if (!title) setTitle(`Coaching Clinic · ${ev.title}`);
      if (ev.event_date) setSessionDate(ev.event_date);
      if (ev.venue_id) {
        const v = venues.find((v) => v.id === ev.venue_id);
        if (v) setVenueName(v.name);
      }
    }
  };

  const handleAddGroup = () => {
    const nextIdx = groups.length + 1;
    const colors = ["#FFD43B", "#2563EB", "#FF5A3C", "#2F9E5C", "#A855F7"];
    const col = colors[(nextIdx - 1) % colors.length];
    setGroups([
      ...groups,
      { name: `Grup ${nextIdx}`, color: col, coachId: coaches[0]?.id || "" },
    ]);
  };

  const handleRemoveGroup = (idx: number) => {
    if (groups.length <= 1) return;
    setGroups(groups.filter((_, i) => i !== idx));
  };

  const handleSkillToggle = (id: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !sessionDate) {
      setError("Judul sesi dan tanggal wajib diisi.");
      toast.error("Judul sesi dan tanggal wajib diisi.");
      return;
    }

    startTransition(async () => {
      try {
        const res = unwrap(await createCoachingSessionAction({
          title,
          sessionDate,
          venueName,
          eventId: selectedEventId || null,
          defaultSkillIds: selectedSkillIds,
          groups: groups.map((g) => ({
            name: g.name,
            color: g.color,
            coachId: g.coachId || null,
          })),
        }));
        toast.success(`Sesi coaching "${title}" berhasil dibuat`);
        onCreated(res.sessionId);
        onClose();
      } catch (err: any) {
        setError(err.message || "Gagal membuat sesi");
        toast.error(err.message || "Gagal membuat sesi");
      }
    });
  };

  return (
    <Modal title="Buat Sesi Coaching Baru" onClose={onClose} width={620}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-snow">
        {error && (
          <div className="bg-coral/20 border border-coral text-coral-soft px-3 py-2 rounded-lg text-xs">
            {error}
          </div>
        )}

        {/* Source event (optional) */}
        <div>
          <label className="block text-2xs uppercase tracking-wider text-snow/60 mb-1">
            Buat dari Event (Peserta Otomatis Masuk)
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => handleEventSelect(e.target.value)}
            className="w-full bg-snow/10 border border-snow/15 rounded-lg px-3 py-2.5 text-sm text-snow focus:outline-none focus:border-volt"
          >
            <option value="" className="bg-ink text-snow">
              -- Tidak dari event (Sesi Mandiri) --
            </option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id} className="bg-ink text-snow">
                {ev.title} {ev.event_date ? `(${ev.event_date})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Session Title & Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-2xs uppercase tracking-wider text-snow/60 mb-1">
              Judul Sesi <span className="text-coral">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="mis. Mabar with Coach · Sen, 5 Okt 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-snow/10 border border-snow/15 rounded-lg px-3 py-2 text-sm text-snow focus:outline-none focus:border-volt"
            />
          </div>
          <div>
            <label className="block text-2xs uppercase tracking-wider text-snow/60 mb-1">
              Tanggal Sesi <span className="text-coral">*</span>
            </label>
            <input
              type="date"
              required
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full bg-snow/10 border border-snow/15 rounded-lg px-3 py-2 text-sm text-snow focus:outline-none focus:border-volt"
            />
          </div>
        </div>

        {/* Venue */}
        <div>
          <label className="block text-2xs uppercase tracking-wider text-snow/60 mb-1">
            Venue / Lokasi
          </label>
          <input
            type="text"
            placeholder="mis. Padel Hubz, Kemang"
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            className="w-full bg-snow/10 border border-snow/15 rounded-lg px-3 py-2 text-sm text-snow focus:outline-none focus:border-volt"
          />
        </div>

        {/* Groups and Coaches */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-2xs uppercase tracking-wider text-snow/60">
              Pembagian Grup &amp; Penugasan Coach
            </label>
            <button
              type="button"
              onClick={handleAddGroup}
              className="text-xs text-volt hover:underline"
            >
              + Tambah Grup
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {groups.map((grp, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-ink-2 p-2.5 rounded-xl border border-snow/10"
              >
                <input
                  type="color"
                  value={grp.color}
                  onChange={(e) => {
                    const newGroups = [...groups];
                    newGroups[idx].color = e.target.value;
                    setGroups(newGroups);
                  }}
                  title="Pilih warna grup"
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <input
                  type="text"
                  required
                  placeholder="Nama Grup"
                  value={grp.name}
                  onChange={(e) => {
                    const newGroups = [...groups];
                    newGroups[idx].name = e.target.value;
                    setGroups(newGroups);
                  }}
                  className="w-28 bg-snow/10 border border-snow/15 rounded-lg px-2.5 py-1.5 text-xs text-snow"
                />
                <select
                  value={grp.coachId}
                  onChange={(e) => {
                    const newGroups = [...groups];
                    newGroups[idx].coachId = e.target.value;
                    setGroups(newGroups);
                  }}
                  className="flex-1 bg-snow/10 border border-snow/15 rounded-lg px-2.5 py-1.5 text-xs text-snow"
                >
                  <option value="" className="bg-ink">
                    -- Pilih Coach --
                  </option>
                  {coaches.map((c) => (
                    <option key={c.id} value={c.id} className="bg-ink">
                      Coach {c.name}
                    </option>
                  ))}
                </select>
                {groups.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveGroup(idx)}
                    className="text-snow/50 hover:text-coral text-sm px-2 py-1"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Default skills selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-2xs uppercase tracking-wider text-snow/60">
              Teknik Default yang Dinilai ({selectedSkillIds.length} dipilih)
            </label>
            <button
              type="button"
              onClick={() =>
                setSelectedSkillIds(
                  selectedSkillIds.length === skills.length ? [] : skills.map((s) => s.id)
                )
              }
              className="text-xs text-volt hover:underline"
            >
              {selectedSkillIds.length === skills.length ? "Hapus Semua" : "Pilih Semua"}
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto flex flex-wrap gap-1.5 bg-ink-2 p-2.5 rounded-xl border border-snow/10">
            {skills.map((skill) => {
              const isSelected = selectedSkillIds.includes(skill.id);
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => handleSkillToggle(skill.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    isSelected
                      ? "bg-volt/20 border-volt text-volt font-bold"
                      : "bg-snow/5 border-snow/10 text-snow/70 hover:bg-snow/10"
                  }`}
                >
                  {isSelected ? "✓ " : "+ "}
                  {skill.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-snow/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-snow/70 hover:text-snow"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            data-loading={isPending || undefined}
            className="bg-coral text-ink font-bold text-xs px-5 py-2.5 rounded-lg hover:bg-coral/90 disabled:opacity-50"
          >
            {isPending ? "Membuat Sesi..." : "Buat Sesi Coaching"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
