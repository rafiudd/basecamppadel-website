"use client";

import { unwrap } from "@/lib/actionState";
import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import type { CoachingSkill } from "@/lib/database.types";
import {
  upsertSkillAction,
  toggleSkillActiveAction,
  reorderSkillsAction,
} from "../skill-actions";
import { toast } from "@/components/ui/Toast";

export function MasterTeknikModal({
  skills: initialSkills,
  onClose,
}: {
  skills: CoachingSkill[];
  onClose: () => void;
}) {
  const [skills, setSkills] = useState(initialSkills);
  const [activeTab, setActiveTab] = useState<"teknik" | "in_game">("teknik");
  const [editingSkill, setEditingSkill] = useState<CoachingSkill | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: "", category: "", type: "teknik" as "teknik" | "in_game" });
  const [isPending, startTransition] = useTransition();
  /** Which button's action is running, so only that button shows the spinner. */
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const run = (key: string, action: () => Promise<void>) => {
    setBusyKey(key);
    startTransition(async () => {
      try {
        await action();
      } finally {
        setBusyKey(null);
      }
    });
  };
  const [message, setMessage] = useState<string | null>(null);

  const filteredSkills = skills.filter((s) => s.type === activeTab);
  const categories = Array.from(new Set(filteredSkills.map((s) => s.category)));

  const handleToggle = (skill: CoachingSkill) => {
    const nextActive = !skill.active;
    setSkills((prev) =>
      prev.map((s) => (s.id === skill.id ? { ...s, active: nextActive } : s))
    );
    run(`toggle:${skill.id}`, async () => {
      try {
        unwrap(await toggleSkillActiveAction(skill.id, nextActive));
        toast.success(nextActive ? `Teknik "${skill.name}" diaktifkan` : `Teknik "${skill.name}" dinonaktifkan`);
      } catch (err: any) {
        setMessage(err.message || "Gagal mengubah status");
        toast.error(err.message || "Gagal mengubah status");
      }
    });
  };

  const handleMove = (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= filteredSkills.length) return;

    const newFiltered = [...filteredSkills];
    const [moved] = newFiltered.splice(idx, 1);
    newFiltered.splice(targetIdx, 0, moved);

    // Merge back into skills
    const otherTypeSkills = skills.filter((s) => s.type !== activeTab);
    const updatedSkills = [...otherTypeSkills, ...newFiltered];
    setSkills(updatedSkills);

    const orderedIds = updatedSkills.map((s) => s.id);
    run(`move:${moved.id}:${dir}`, async () => {
      try {
        unwrap(await reorderSkillsAction(orderedIds));
        toast.success("Urutan teknik berhasil diperbarui");
      } catch (err: any) {
        setMessage(err.message || "Gagal mengubah urutan");
        toast.error(err.message || "Gagal mengubah urutan");
      }
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.category.trim()) return;

    run("save", async () => {
      try {
        if (editingSkill) {
          unwrap(await upsertSkillAction({
            id: editingSkill.id,
            name: formData.name,
            category: formData.category,
            type: formData.type,
          }));
          setSkills((prev) =>
            prev.map((s) =>
              s.id === editingSkill.id
                ? { ...s, name: formData.name, category: formData.category, type: formData.type }
                : s
            )
          );
          setEditingSkill(null);
          toast.success(`Teknik "${formData.name}" berhasil diperbarui`);
        } else {
          unwrap(await upsertSkillAction({
            name: formData.name,
            category: formData.category,
            type: formData.type,
          }));
          toast.success(`Teknik "${formData.name}" berhasil ditambahkan`);
          window.location.reload();
        }
        setIsAdding(false);
        setFormData({ name: "", category: "", type: activeTab });
      } catch (err: any) {
        setMessage(err.message || "Gagal menyimpan item");
        toast.error(err.message || "Gagal menyimpan item");
      }
    });
  };

  return (
    <Modal title="Master Daftar Teknik & In-Game" onClose={onClose} width={640}>
      <div className="flex flex-col gap-4 text-snow">
        <p className="text-xs text-snow/70">
          Satu daftar teknik yang sama untuk semua coach. Total 39 item terbagi dalam Teknik dan In-game.
          Item yang dinonaktifkan tetap tampil di nilai lama.
        </p>

        {message && (
          <div className="bg-coral/20 border border-coral text-coral-soft px-3 py-2 rounded-lg text-xs">
            {message}
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-snow/10 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("teknik")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === "teknik" ? "bg-volt text-ink" : "bg-snow/10 text-snow hover:bg-snow/15"
            }`}
          >
            Teknik ({skills.filter((s) => s.type === "teknik").length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("in_game")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === "in_game" ? "bg-volt text-ink" : "bg-snow/10 text-snow hover:bg-snow/15"
            }`}
          >
            In-game ({skills.filter((s) => s.type === "in_game").length})
          </button>
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => {
                setIsAdding(true);
                setEditingSkill(null);
                setFormData({ name: "", category: "", type: activeTab });
              }}
              className="bg-snow/15 hover:bg-snow/20 text-snow font-bold text-xs px-3 py-1.5 rounded-lg"
            >
              + Tambah Item
            </button>
          </div>
        </div>

        {/* Add / Edit Form */}
        {(isAdding || editingSkill) && (
          <form onSubmit={handleSave} className="bg-ink-2 p-4 rounded-xl border border-snow/10 flex flex-col gap-3">
            <div className="font-bold text-sm text-volt">
              {editingSkill ? `Edit Item: ${editingSkill.name}` : `Tambah Item Baru (${activeTab})`}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-2xs uppercase text-snow/60 mb-1">Nama Item</label>
                <input
                  type="text"
                  required
                  placeholder="mis. Smash x3 / x4"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-snow/10 border border-snow/15 rounded-lg px-3 py-2 text-sm text-snow focus:outline-none focus:border-volt"
                />
              </div>
              <div>
                <label className="block text-2xs uppercase text-snow/60 mb-1">Kategori</label>
                <input
                  type="text"
                  required
                  placeholder="mis. Overhead, Groundstroke, Mental"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-snow/10 border border-snow/15 rounded-lg px-3 py-2 text-sm text-snow focus:outline-none focus:border-volt"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingSkill(null);
                }}
                className="px-3 py-1.5 text-xs text-snow/70 hover:text-snow"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isPending}
                data-loading={busyKey === "save" || undefined}
                className="bg-volt text-ink font-bold text-xs px-4 py-1.5 rounded-lg hover:bg-volt/90 disabled:opacity-50"
              >
                {isPending ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        )}

        {/* Skills list grouped by category */}
        <div className="max-h-96 overflow-y-auto flex flex-col gap-4 pr-1">
          {categories.map((cat) => {
            const catSkills = filteredSkills.filter((s) => s.category === cat);
            return (
              <div key={cat} className="flex flex-col gap-1.5">
                <div className="text-2xs font-bold uppercase tracking-wider text-volt/90">
                  {cat}
                </div>
                <div className="flex flex-col gap-1">
                  {catSkills.map((skill, idx) => {
                    return (
                      <div
                        key={skill.id}
                        className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border ${
                          skill.active
                            ? "bg-ink-2 border-snow/10"
                            : "bg-ink-2/40 border-snow/5 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-sm truncate">{skill.name}</span>
                          {!skill.active && (
                            <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-snow/10 text-snow/50">
                              Nonaktif
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-none">
                          <button
                            type="button"
                            title="Pindah ke atas"
                            onClick={() => handleMove(filteredSkills.indexOf(skill), -1)}
                            data-loading={busyKey === `move:${skill.id}:-1` || undefined}
                            className="text-snow/60 hover:text-snow text-xs px-1.5 py-0.5 bg-snow/5 rounded"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            title="Pindah ke bawah"
                            onClick={() => handleMove(filteredSkills.indexOf(skill), 1)}
                            data-loading={busyKey === `move:${skill.id}:1` || undefined}
                            className="text-snow/60 hover:text-snow text-xs px-1.5 py-0.5 bg-snow/5 rounded"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSkill(skill);
                              setIsAdding(false);
                              setFormData({
                                name: skill.name,
                                category: skill.category,
                                type: skill.type,
                              });
                            }}
                            className="text-xs text-snow/70 hover:text-volt px-2 py-1 bg-snow/5 rounded"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggle(skill)}
                            data-loading={busyKey === `toggle:${skill.id}` || undefined}
                            className={`text-xs px-2.5 py-1 rounded font-medium transition-all ${
                              skill.active
                                ? "bg-win/20 text-win-soft hover:bg-win/30"
                                : "bg-snow/10 text-snow/60 hover:bg-snow/20"
                            }`}
                          >
                            {skill.active ? "Aktif" : "Aktifkan"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
