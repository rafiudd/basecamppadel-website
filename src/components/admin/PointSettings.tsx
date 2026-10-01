"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PointPreset, PointCategoryItem } from "@/lib/database.types";
import { savePointPresetRules, deletePointPreset } from "@/app/admin/point/actions";
import { DeletePresetModal } from "./DeletePresetModal";

interface PresetStateItem {
  id: string;
  name: string;
  is_default: boolean;
  mabar: PointCategoryItem[];
  kompetisi: PointCategoryItem[];
}

const FALLBACK_PRESETS: PresetStateItem[] = [
  {
    id: "a9ae4303-4fea-42b0-8273-eb8f8cd8f6b1",
    name: "Standar",
    is_default: true,
    mabar: [
      { id: "m1", name: "Juara 1", desc: "Posisi 1 klasemen akhir", points: 30, checked: true },
      { id: "m2", name: "Juara 2", desc: "Posisi 2 klasemen akhir", points: 20, checked: true },
      { id: "m3", name: "Juara 3", desc: "Posisi 3 klasemen akhir", points: 10, checked: true },
      { id: "m4", name: "Ikut serta", desc: "Semua peserta lain yang main sampai selesai", points: 5, checked: true },
    ],
    kompetisi: [
      { id: "k1", name: "Ikut fase grup", desc: "Semua tim peserta", points: 5, checked: true },
      { id: "k2", name: "Lolos grup / 8 besar", desc: "Masuk babak knockout", points: 15, checked: true },
      { id: "k3", name: "Semifinal", desc: "Kalah di semifinal", points: 30, checked: true },
      { id: "k4", name: "Runner-up", desc: "Kalah di final", points: 50, checked: true },
      { id: "k5", name: "Juara", desc: "Menang final", points: 80, checked: true },
    ],
  },
  {
    id: "403d7e98-91a1-4306-a16d-caf60de852db",
    name: "Turnamen besar",
    is_default: true,
    mabar: [
      { id: "m1", name: "Juara 1", desc: "Posisi 1 klasemen akhir", points: 50, checked: true },
      { id: "m2", name: "Juara 2", desc: "Posisi 2 klasemen akhir", points: 35, checked: true },
      { id: "m3", name: "Juara 3", desc: "Posisi 3 klasemen akhir", points: 20, checked: true },
      { id: "m4", name: "Ikut serta", desc: "Semua peserta lain yang main sampai selesai", points: 10, checked: true },
    ],
    kompetisi: [
      { id: "k1", name: "Ikut fase grup", desc: "Semua tim peserta", points: 10, checked: true },
      { id: "k2", name: "Lolos grup / 8 besar", desc: "Masuk babak knockout", points: 30, checked: true },
      { id: "k3", name: "Semifinal", desc: "Kalah di semifinal", points: 60, checked: true },
      { id: "k4", name: "Runner-up", desc: "Kalah di final", points: 100, checked: true },
      { id: "k5", name: "Juara", desc: "Menang final", points: 160, checked: true },
    ],
  },
];

function parsePoints(raw: string): number | "" {
  const clean = raw.replace(/\D/g, "");
  if (!clean) return "";
  const noLeading = clean.replace(/^0+(?=\d)/, "");
  return noLeading === "" ? 0 : Number(noLeading);
}

function normalizePresets(presetsFromDb?: PointPreset[]): PresetStateItem[] {
  if (!presetsFromDb || presetsFromDb.length === 0) {
    return FALLBACK_PRESETS;
  }

  return presetsFromDb.map((p) => ({
    id: p.id,
    name: p.name,
    is_default: p.is_default,
    mabar: (Array.isArray(p.rules?.mabar) ? p.rules.mabar : []).filter(
      (i) => i.checked !== false
    ),
    kompetisi: (Array.isArray(p.rules?.kompetisi) ? p.rules.kompetisi : []).filter(
      (i) => i.checked !== false
    ),
  }));
}

export function PointSettings({
  initialPresets,
  initialPresetId,
}: {
  initialPresets?: PointPreset[];
  initialPresetId?: string;
}) {
  const router = useRouter();
  const normalized = normalizePresets(initialPresets);
  const [presets, setPresets] = useState<PresetStateItem[]>(normalized);

  const initialSelected =
    presets.find((p) => p.id === initialPresetId || p.name.toLowerCase() === initialPresetId?.toLowerCase())?.id ??
    presets[0]?.id ??
    "standar";

  const [activePresetId, setActivePresetId] = useState(initialSelected);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const currentPreset = presets.find((p) => p.id === activePresetId) ?? presets[0];

  const handlePointChange = (
    type: "mabar" | "kompetisi",
    id: string,
    rawVal: string
  ) => {
    const parsed = parsePoints(rawVal);
    setPresets((prev) =>
      prev.map((preset) => {
        if (preset.id !== activePresetId) return preset;
        return {
          ...preset,
          [type]: preset[type].map((item) =>
            item.id === id ? { ...item, points: parsed } : item
          ),
        };
      })
    );
  };

  const handlePointBlur = (type: "mabar" | "kompetisi", id: string) => {
    setPresets((prev) =>
      prev.map((preset) => {
        if (preset.id !== activePresetId) return preset;
        return {
          ...preset,
          [type]: preset[type].map((item) =>
            item.id === id && item.points === "" ? { ...item, points: 0 } : item
          ),
        };
      })
    );
  };

  const handleSave = async () => {
    if (!currentPreset) return;
    setIsSaving(true);
    setFeedback(null);

    const res = await savePointPresetRules(currentPreset.id, {
      mabar: currentPreset.mabar,
      kompetisi: currentPreset.kompetisi,
    });

    setIsSaving(false);
    if (res.success) {
      setFeedback({ message: "✓ Perubahan tersimpan", type: "success" });
      setTimeout(() => setFeedback(null), 3000);
      router.refresh();
    } else {
      setFeedback({ message: res.error || "Gagal menyimpan perubahan", type: "error" });
    }
  };

  const handleOpenDeleteModal = () => {
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!currentPreset) return;
    setIsDeleting(true);
    setDeleteError(null);

    const res = await deletePointPreset(currentPreset.id);
    setIsDeleting(false);

    if (res.success) {
      const remaining = presets.filter((p) => p.id !== currentPreset.id);
      setPresets(remaining);
      setActivePresetId(remaining[0]?.id ?? "");
      setIsDeleteModalOpen(false);
      router.push("/admin/point");
      router.refresh();
    } else {
      setDeleteError(res.error || "Gagal menghapus preset");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display font-bold text-[26px] leading-[1.3] text-snow">
            Poin
          </h1>
          <p className="text-sm text-snow/70 leading-[1.45]">
            Atur berapa poin leaderboard yang didapat dari tiap event. Preset dipilih saat membuat event.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {feedback && (
            <span
              className={`text-xs font-semibold animate-fade-in ${
                feedback.type === "success" ? "text-volt" : "text-coral"
              }`}
            >
              {feedback.message}
            </span>
          )}
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="btn btn-coral text-ink font-bold text-sm min-h-[40px] px-[18px] py-2.5 rounded-lg whitespace-nowrap flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? "Menyimpan..." : "Simpan perubahan"}
          </button>
        </div>
      </div>

      {/* Preset Pills / Tabs */}
      <div className="flex gap-1.5 flex-wrap items-center">
        {presets.map((p) => {
          const isActive = p.id === activePresetId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setActivePresetId(p.id)}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? "bg-indigo text-snow"
                  : "bg-ink-3 text-snow/80 hover:bg-ink-2"
              }`}
            >
              {p.name}
            </button>
          );
        })}
        <Link
          href="/admin/point/preset"
          className="text-sm font-bold text-volt no-underline px-2 py-2.5 hover:underline whitespace-nowrap"
        >
          + Preset baru
        </Link>
      </div>

      {/* Preset sub-toolbar: Preset Name, Edit, and Delete */}
      {currentPreset && (
        <div className="flex items-center justify-between bg-ink-2/60 rounded-xl px-4 py-2 border border-snow/6 flex-wrap gap-2">
          <div className="text-xs text-snow/60">
            Preset Name: <span className="font-semibold text-snow">{currentPreset.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/point/preset?edit=${currentPreset.id}`}
              className="text-xs text-snow/80 hover:text-snow font-semibold no-underline hover:underline cursor-pointer"
            >
              Edit preset
            </Link>
            <span className="text-snow/20">·</span>
            <button
              type="button"
              onClick={handleOpenDeleteModal}
              className="text-xs text-coral hover:underline font-semibold bg-transparent border-0 cursor-pointer"
            >
              Hapus preset
            </button>
          </div>
        </div>
      )}

      {/* Responsive Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        {/* Card 1: Event Mabar */}
        <section className="bg-ink-2 rounded-2xl p-5 md:p-[22px_24px] flex flex-col">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-sans text-xs font-bold bg-volt/16 text-volt whitespace-nowrap">
              Mabar
            </span>
            <div className="font-display font-bold text-lg text-snow">
              Event mabar
            </div>
          </div>
          <div className="text-[13px] text-snow/70 mb-2">
            Diberikan ke pemain sesuai posisi di klasemen akhir event.
          </div>

          {currentPreset.mabar.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 py-3 border-t border-snow/8"
            >
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[15px] text-snow">{item.name}</div>
                {item.desc && (
                  <div className="text-[13px] text-snow/70 mt-0.5">{item.desc}</div>
                )}
              </div>
              <div className="flex items-center justify-end bg-snow/10 rounded-lg px-3 min-h-[44px] focus-within:ring-2 focus-within:ring-volt w-28 md:w-32 flex-none gap-1.5 transition-all">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  aria-label={`Poin ${item.name}`}
                  value={item.points}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    handlePointChange("mabar", item.id, e.target.value)
                  }
                  onBlur={() => handlePointBlur("mabar", item.id)}
                  className="w-full bg-transparent text-right font-display font-bold text-lg text-snow outline-none placeholder:text-snow/30"
                />
                <span className="text-[13px] text-snow/70 flex-none select-none">
                  poin
                </span>
              </div>
            </div>
          ))}
          {currentPreset.mabar.length === 0 && (
            <div className="text-sm text-snow/50 py-4 text-center">
              Belum ada kategori mabar pada preset ini.
            </div>
          )}
        </section>

        {/* Card 2: Event Kompetisi */}
        <section className="bg-ink-2 rounded-2xl p-5 md:p-[22px_24px] flex flex-col">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-sans text-xs font-bold bg-coral/18 text-[#FF8A73] whitespace-nowrap">
              Kompetisi
            </span>
            <div className="font-display font-bold text-lg text-snow">
              Event kompetisi
            </div>
          </div>
          <div className="text-[13px] text-snow/70 mb-2">
            Diberikan ke tiap pemain di tim, hanya untuk tahap tertinggi yang dicapai (tidak diakumulasi).
          </div>

          {currentPreset.kompetisi.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 py-3 border-t border-snow/8"
            >
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[15px] text-snow">{item.name}</div>
                {item.desc && (
                  <div className="text-[13px] text-snow/70 mt-0.5">{item.desc}</div>
                )}
              </div>
              <div className="flex items-center justify-end bg-snow/10 rounded-lg px-3 min-h-[44px] focus-within:ring-2 focus-within:ring-volt w-28 md:w-32 flex-none gap-1.5 transition-all">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  aria-label={`Poin ${item.name}`}
                  value={item.points}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    handlePointChange("kompetisi", item.id, e.target.value)
                  }
                  onBlur={() => handlePointBlur("kompetisi", item.id)}
                  className="w-full bg-transparent text-right font-display font-bold text-lg text-snow outline-none placeholder:text-snow/30"
                />
                <span className="text-[13px] text-snow/70 flex-none select-none">
                  poin
                </span>
              </div>
            </div>
          ))}
          {currentPreset.kompetisi.length === 0 && (
            <div className="text-sm text-snow/50 py-4 text-center">
              Belum ada kategori kompetisi pada preset ini.
            </div>
          )}
        </section>
      </div>

      <DeletePresetModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) setIsDeleteModalOpen(false);
        }}
        presetName={currentPreset?.name ?? ""}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        errorMessage={deleteError}
      />
    </div>
  );
}
