"use client";

import { unwrap } from "@/lib/actionState";
import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { useTopLoaderWhile } from "@/components/TopLoader";
import type { CoachingSkill } from "@/lib/database.types";
import {
  upsertSkillAction,
  toggleSkillActiveAction,
  deleteSkillAction,
} from "../skill-actions";
import { toast } from "@/components/ui/Toast";

const KNOWN_CATEGORIES = [
  "Groundstroke",
  "Servis & return",
  "Di net",
  "Overhead",
  "Kaca / dinding",
  "Pukulan variasi",
  "Taktik & strategi",
  "Kerja sama",
  "Mental",
  "Fisik",
];

export function MasterSkillsClient({
  initialSkills,
  isAdmin,
}: {
  initialSkills: CoachingSkill[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [skills, setSkills] = useState<CoachingSkill[]>(initialSkills);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "teknik" | "in_game">("all");
  const [activeOnly, setActiveOnly] = useState(false);

  // Edit/Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<CoachingSkill | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"teknik" | "in_game">("teknik");
  const [formCategory, setFormCategory] = useState(KNOWN_CATEGORIES[0]);
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  /** Which button's action is running, so only that button shows the spinner. */
  const [busyKey, setBusyKey] = useState<string | null>(null);
  useTopLoaderWhile(isPending || busyKey !== null);
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

  // Filtered skills
  const filteredSkills = useMemo(() => {
    return skills.filter((s) => {
      if (typeFilter !== "all" && s.type !== typeFilter) return false;
      if (activeOnly && !s.active) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesCat = s.category.toLowerCase().includes(q);
        if (!matchesName && !matchesCat) return false;
      }
      return true;
    });
  }, [skills, typeFilter, activeOnly, searchQuery]);

  const stats = useMemo(() => {
    const total = skills.length;
    const teknik = skills.filter((s) => s.type === "teknik").length;
    const ingame = skills.filter((s) => s.type === "in_game").length;
    const active = skills.filter((s) => s.active).length;
    return { total, teknik, ingame, active };
  }, [skills]);

  const handleOpenCreate = () => {
    setEditingSkill(null);
    setFormName("");
    setFormType("teknik");
    setFormCategory("Groundstroke");
    setFormActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (skill: CoachingSkill) => {
    setEditingSkill(skill);
    setFormName(skill.name);
    setFormType(skill.type as "teknik" | "in_game");
    setFormCategory(skill.category);
    setFormActive(skill.active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Nama teknik wajib diisi.");
      return;
    }

    run("save", async () => {
      try {
        unwrap(await upsertSkillAction({
          id: editingSkill?.id,
          name: formName.trim(),
          type: formType,
          category: formCategory.trim(),
          active: formActive,
        }));

        // Update local state
        if (editingSkill) {
          setSkills((prev) =>
            prev.map((s) =>
              s.id === editingSkill.id
                ? { ...s, name: formName.trim(), type: formType, category: formCategory.trim(), active: formActive }
                : s
            )
          );
          toast.success(`Teknik "${formName.trim()}" berhasil diperbarui`);
        } else {
          toast.success(`Teknik "${formName.trim()}" berhasil ditambahkan`);
          router.refresh();
        }

        setIsModalOpen(false);
      } catch (err: any) {
        setFormError(err.message || "Gagal menyimpan teknik");
        toast.error(err.message || "Gagal menyimpan teknik");
      }
    });
  };

  const handleToggleActive = (skill: CoachingSkill) => {
    const newActive = !skill.active;
    // Optimistic
    setSkills((prev) =>
      prev.map((s) => (s.id === skill.id ? { ...s, active: newActive } : s))
    );

    run(`toggle:${skill.id}`, async () => {
      try {
        unwrap(await toggleSkillActiveAction(skill.id, newActive));
        toast.success(newActive ? `Teknik "${skill.name}" diaktifkan` : `Teknik "${skill.name}" dinonaktifkan`);
      } catch {
        // Rollback
        setSkills((prev) =>
          prev.map((s) => (s.id === skill.id ? { ...s, active: !newActive } : s))
        );
        toast.error("Gagal mengubah status teknik");
      }
    });
  };

  const handleDelete = (skill: CoachingSkill) => {
    if (!confirm(`Hapus teknik "${skill.name}"? Perhatian: ini dapat menghapus nilai teknik jika ada di sesi.`)) {
      return;
    }

    run(`delete:${skill.id}`, async () => {
      try {
        unwrap(await deleteSkillAction(skill.id));
        setSkills((prev) => prev.filter((s) => s.id !== skill.id));
        toast.success(`Teknik "${skill.name}" berhasil dihapus`);
      } catch (err: any) {
        toast.error(err.message || "Gagal menghapus teknik");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 text-[#FBF7F1] w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#FBF7F1]/10">
        <div>
          <Link
            href="/admin/coaching"
            className="text-sm text-[#FBF7F1]/70 hover:text-[#FFD43B] no-underline inline-flex items-center gap-1.5 mb-2 transition-colors"
          >
            ← Kembali ke Catatan Coaching
          </Link>
          <h1 className="font-display font-bold text-2xl lg:text-[28px] m-0 leading-tight">
            Master Teknik Coaching
          </h1>
          <p className="m-0 mt-1.5 text-sm text-[#FBF7F1]/70">
            Kelola daftar 39 teknik dan aspek penilaian in-game. Digunakan di formulir penilaian coach &amp; rapor pemain.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="border-0 rounded-lg min-h-11 px-5 font-sans font-bold text-sm whitespace-nowrap inline-flex items-center justify-center gap-2 bg-[#FF5A3C] text-[#17151F] hover:bg-[#FF5A3C]/90 transition-all shadow-md self-start sm:self-auto"
          >
            + Tambah Teknik Baru
          </button>
        )}
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#221F30] rounded-xl p-3.5 border border-[#FBF7F1]/5">
          <div className="text-2xs text-[#FBF7F1]/60 uppercase tracking-wider font-semibold">Total Item</div>
          <div className="text-2xl font-display font-bold text-snow mt-1">{stats.total}</div>
        </div>
        <div className="bg-[#221F30] rounded-xl p-3.5 border border-[#FBF7F1]/5">
          <div className="text-2xs text-[#FBF7F1]/60 uppercase tracking-wider font-semibold">Kategori Teknik</div>
          <div className="text-2xl font-display font-bold text-[#FFD43B] mt-1">{stats.teknik}</div>
        </div>
        <div className="bg-[#221F30] rounded-xl p-3.5 border border-[#FBF7F1]/5">
          <div className="text-2xs text-[#FBF7F1]/60 uppercase tracking-wider font-semibold">Kategori In-Game</div>
          <div className="text-2xl font-display font-bold text-[#6FD39A] mt-1">{stats.ingame}</div>
        </div>
        <div className="bg-[#221F30] rounded-xl p-3.5 border border-[#FBF7F1]/5">
          <div className="text-2xs text-[#FBF7F1]/60 uppercase tracking-wider font-semibold">Status Aktif</div>
          <div className="text-2xl font-display font-bold text-snow mt-1">{stats.active}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#221F30] rounded-2xl p-4 flex flex-col sm:flex-row gap-3.5 sm:items-center justify-between border border-[#FBF7F1]/5">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className={`border-0 rounded-lg min-h-9 px-3.5 font-sans font-bold text-xs whitespace-nowrap transition-all ${
              typeFilter === "all"
                ? "bg-[#FBF7F1]/20 text-[#FBF7F1]"
                : "bg-transparent text-[#FBF7F1]/70 hover:text-[#FBF7F1]"
            }`}
          >
            Semua ({skills.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("teknik")}
            className={`border-0 rounded-lg min-h-9 px-3.5 font-sans font-bold text-xs whitespace-nowrap transition-all ${
              typeFilter === "teknik"
                ? "bg-[#FFD43B]/20 text-[#FFD43B] border border-[#FFD43B]/40"
                : "bg-transparent text-[#FBF7F1]/70 hover:text-[#FBF7F1]"
            }`}
          >
            Teknik ({stats.teknik})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("in_game")}
            className={`border-0 rounded-lg min-h-9 px-3.5 font-sans font-bold text-xs whitespace-nowrap transition-all ${
              typeFilter === "in_game"
                ? "bg-[#6FD39A]/20 text-[#6FD39A] border border-[#6FD39A]/40"
                : "bg-transparent text-[#FBF7F1]/70 hover:text-[#FBF7F1]"
            }`}
          >
            In-Game ({stats.ingame})
          </button>

          <label className="flex items-center gap-2 text-xs text-[#FBF7F1]/75 ml-2 cursor-pointer">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="w-4 h-4 accent-[#FFD43B]"
            />
            <span>Hanya Aktif</span>
          </label>
        </div>

        <div className="w-full sm:w-64">
          <input
            type="search"
            placeholder="Cari teknik atau kategori…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#FBF7F1]/10 border-0 rounded-lg px-3 py-2 text-sm text-[#FBF7F1] focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
          />
        </div>
      </div>

      {/* Skills Table */}
      <div className="bg-[#1F1C2B] rounded-2xl border border-[#FBF7F1]/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#FBF7F1]/10 bg-[#221F30]/70 text-[#FBF7F1]/65 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Nama Teknik</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Tipe</th>
                <th className="py-3 px-4 text-center">Status</th>
                {isAdmin && <th className="py-3 px-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FBF7F1]/6">
              {filteredSkills.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-[#FBF7F1]/50 text-sm">
                    Tidak ada teknik yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredSkills.map((skill, index) => (
                  <tr
                    key={skill.id}
                    className="hover:bg-[#FBF7F1]/3 transition-colors group"
                  >
                    <td className="py-3 px-4 text-center text-xs text-[#FBF7F1]/50 font-mono">
                      {skill.sort_order || index + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-snow">
                      {skill.name}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#FBF7F1]/75">
                      {skill.category}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider ${
                          skill.type === "teknik"
                            ? "bg-[#FFD43B]/15 text-[#FFD43B]"
                            : "bg-[#6FD39A]/15 text-[#6FD39A]"
                        }`}
                      >
                        {skill.type === "teknik" ? "Teknik" : "In-Game"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(skill)}
                        data-loading={busyKey === `toggle:${skill.id}` || undefined}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer transition-all border ${
                          skill.active
                            ? "bg-[#6FD39A]/20 border-[#6FD39A]/40 text-[#6FD39A]"
                            : "bg-[#FBF7F1]/10 border-transparent text-[#FBF7F1]/50"
                        }`}
                      >
                        {skill.active ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(skill)}
                            className="text-xs bg-[#FBF7F1]/10 hover:bg-[#FBF7F1]/15 text-[#FBF7F1] px-2.5 py-1 rounded-md transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(skill)}
                            data-loading={busyKey === `delete:${skill.id}` || undefined}
                            className="text-xs bg-transparent hover:bg-[#FF5A3C]/20 text-[#FF5A3C] px-2.5 py-1 rounded-md transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Teknik */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#221F30] rounded-2xl p-6 w-full max-w-md border border-[#FBF7F1]/10 shadow-2xl flex flex-col gap-4 text-[#FBF7F1]">
            <div className="flex justify-between items-center border-b border-[#FBF7F1]/10 pb-3">
              <h2 className="font-display font-bold text-lg m-0">
                {editingSkill ? "Edit Teknik Coaching" : "Tambah Teknik Baru"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#FBF7F1]/60 hover:text-[#FBF7F1] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="bg-coral/20 border border-coral text-coral-soft px-3 py-2 rounded-lg text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <label className="block">
                <span className="text-2xs uppercase tracking-wider text-[#FBF7F1]/70 block mb-1 font-semibold">
                  Nama Teknik / Aspek *
                </span>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bandeja, Forehand, Positioning"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#FBF7F1]/10 border-0 rounded-lg px-3 py-2.5 text-sm text-snow focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-2xs uppercase tracking-wider text-[#FBF7F1]/70 block mb-1 font-semibold">
                    Tipe
                  </span>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as "teknik" | "in_game")}
                    className="w-full bg-[#FBF7F1]/10 border-0 rounded-lg px-3 py-2.5 text-sm text-snow appearance-auto focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
                  >
                    <option value="teknik" className="bg-[#17151F]">Teknik</option>
                    <option value="in_game" className="bg-[#17151F]">In-Game</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-2xs uppercase tracking-wider text-[#FBF7F1]/70 block mb-1 font-semibold">
                    Kategori
                  </span>
                  <input
                    type="text"
                    list="known-categories"
                    required
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-[#FBF7F1]/10 border-0 rounded-lg px-3 py-2.5 text-sm text-snow focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
                  />
                  <datalist id="known-categories">
                    {KNOWN_CATEGORIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </label>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="w-4 h-4 accent-[#FFD43B]"
                />
                <span className="text-sm font-medium">Status Aktif (muncul di penilaian)</span>
              </label>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#FBF7F1]/10 mt-1">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="border-0 rounded-lg px-4 py-2 font-bold text-sm bg-transparent text-[#FBF7F1]/75 hover:bg-[#FBF7F1]/10"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  data-loading={busyKey === "save" || undefined}
                  className="border-0 rounded-lg px-5 py-2 font-bold text-sm bg-[#FF5A3C] text-[#17151F] hover:bg-[#FF5A3C]/90 disabled:opacity-50"
                >
                  {isPending ? "Menyimpan..." : "Simpan Teknik"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
