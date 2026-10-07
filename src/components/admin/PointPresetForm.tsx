"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import type { PointCategoryItem, PointPreset } from "@/lib/database.types";
import { createPointPreset, updatePointPreset, getPointPresetById } from "@/app/admin/point/actions";
import { toast } from "@/components/ui/Toast";

const DEFAULT_KOMPETISI_CATEGORIES: PointCategoryItem[] = [
  { id: "k-juara", name: "Juara", desc: "Menang final", points: 80, checked: true },
  { id: "k-runnerup", name: "Runner-up", desc: "Kalah di final", points: 50, checked: true },
  { id: "k-juara3", name: "Juara 3", desc: "Menang perebutan juara 3", points: 40, checked: false },
  { id: "k-semifinal", name: "Semifinal", desc: "Kalah di semifinal", points: 30, checked: true },
  { id: "k-8besar", name: "8 besar", desc: "Kalah di perempat final", points: 15, checked: true },
  { id: "k-lolosgrup", name: "Lolos grup", desc: "Lolos fase grup (kalau knockout mulai di atas 8 besar)", points: 10, checked: false },
  { id: "k-ikutgrup", name: "Ikut fase grup", desc: "Semua tim peserta", points: 5, checked: true },
  { id: "k-mvp", name: "MVP", points: 20, checked: true, isCustom: true },
];

const DEFAULT_MABAR_CATEGORIES: PointCategoryItem[] = [
  { id: "m-juara1", name: "Juara 1", desc: "Posisi 1 klasemen akhir", points: 30, checked: true },
  { id: "m-juara2", name: "Juara 2", desc: "Posisi 2 klasemen akhir", points: 20, checked: true },
  { id: "m-juara3", name: "Juara 3", desc: "Posisi 3 klasemen akhir", points: 10, checked: true },
  { id: "m-juara4", name: "Juara 4", desc: "Posisi 4 klasemen akhir", points: 0, checked: false },
  { id: "m-ikut", name: "Ikut serta", desc: "Semua peserta yang main sampai selesai", points: 5, checked: true },
];

function parsePoints(raw: string): number | "" {
  const clean = raw.replace(/\D/g, "");
  if (!clean) return "";
  const noLeading = clean.replace(/^0+(?=\d)/, "");
  return noLeading === "" ? 0 : Number(noLeading);
}

export function PointPresetForm({
  initialPreset,
}: {
  initialPreset?: PointPreset;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editParam = searchParams.get("edit");
  const isEditMode = !!initialPreset || !!editParam;

  const [currentPresetId, setCurrentPresetId] = useState<string | null>(
    initialPreset?.id ?? editParam ?? null
  );
  const [presetName, setPresetName] = useState(
    initialPreset?.name ?? (isEditMode ? "" : "Kompetisi bulanan")
  );
  const [activeTab, setActiveTab] = useState<"kompetisi" | "mabar">("kompetisi");

  // In edit mode: NEVER display default categories, strictly use preset rules
  const [kompetisiItems, setKompetisiItems] = useState<PointCategoryItem[]>(() =>
    isEditMode
      ? (initialPreset?.rules?.kompetisi ?? []).map((i) => ({ ...i, checked: true }))
      : DEFAULT_KOMPETISI_CATEGORIES
  );
  const [mabarItems, setMabarItems] = useState<PointCategoryItem[]>(() =>
    isEditMode
      ? (initialPreset?.rules?.mabar ?? []).map((i) => ({ ...i, checked: true }))
      : DEFAULT_MABAR_CATEGORIES
  );


  // Client-side fallback: if edit param is present in URL but initialPreset wasn't passed
  useEffect(() => {
    if (editParam && !initialPreset) {
      getPointPresetById(editParam).then((preset) => {
        if (preset) {
          setCurrentPresetId(preset.id);
          setPresetName(preset.name);
          setKompetisiItems((preset.rules?.kompetisi ?? []).map((i) => ({ ...i, checked: true })));
          setMabarItems((preset.rules?.mabar ?? []).map((i) => ({ ...i, checked: true })));
        }
      });
    }
  }, [editParam, initialPreset]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeItems = activeTab === "kompetisi" ? kompetisiItems : mabarItems;
  const setActiveItems = activeTab === "kompetisi" ? setKompetisiItems : setMabarItems;

  const handleToggleCheck = (id: string) => {
    setActiveItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handlePointChange = (id: string, rawVal: string) => {
    const parsed = parsePoints(rawVal);
    setActiveItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, points: parsed } : item))
    );
  };

  const handlePointBlur = (id: string) => {
    setActiveItems((prev) =>
      prev.map((item) =>
        item.id === id && item.points === "" ? { ...item, points: 0 } : item
      )
    );
  };

  const handleCustomNameChange = (id: string, name: string) => {
    setActiveItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name } : item))
    );
  };

  const handleDeleteItem = (id: string) => {
    setActiveItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddCategory = () => {
    const newItem: PointCategoryItem = {
      id: `custom-${Date.now()}`,
      name: "Kategori baru",
      points: 10,
      checked: true,
      isCustom: true,
    };
    setActiveItems((prev) => [...prev, newItem]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = presetName.trim();
    if (!cleanName) {
      toast.error("Nama preset wajib diisi");
      return;
    }

    setIsSubmitting(true);

    // Only save checked categories and sanitize empty points to 0
    const finalMabar = mabarItems
      .filter((item) => item.checked)
      .map((item) => ({
        ...item,
        points: item.points === "" ? 0 : item.points,
      }));
    const finalKompetisi = kompetisiItems
      .filter((item) => item.checked)
      .map((item) => ({
        ...item,
        points: item.points === "" ? 0 : item.points,
      }));

    const targetPresetId = currentPresetId || initialPreset?.id || editParam;
    const res = isEditMode && targetPresetId
      ? await updatePointPreset(targetPresetId, cleanName, {
          mabar: finalMabar,
          kompetisi: finalKompetisi,
        })
      : await createPointPreset(cleanName, {
          mabar: finalMabar,
          kompetisi: finalKompetisi,
        });

    if (res.success) {
      toast.success(isEditMode ? "Preset diperbarui" : "Preset dibuat");
      const targetId = isEditMode ? targetPresetId : (res as { id?: string }).id;
      router.push(`/admin/point?preset=${targetId}`);
      router.refresh();
    } else {
      setIsSubmitting(false);
      toast.error(res.error || "Gagal menyimpan preset");
    }
  };

  const backUrl = isEditMode && currentPresetId ? `/admin/point?preset=${currentPresetId}` : "/admin/point";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Back Link & Header */}
      <div className="flex flex-col gap-1.5">
        <Link
          href={backUrl}
          className="text-sm text-snow/70 hover:text-snow no-underline inline-flex items-center gap-1 transition-colors"
        >
          ← Poin
        </Link>
        <h1 className="font-display font-bold text-[26px] leading-[1.3] text-snow">
          {isEditMode ? `Edit Preset: ${presetName || initialPreset?.name || ""}` : "Preset poin baru"}
        </h1>
      </div>

      {/* Preset Details Section */}
      <section className="bg-ink-2 rounded-2xl p-5 md:p-[22px_24px] flex flex-col gap-4">
        <label className="block">
          <div className="label">Nama preset</div>
          <input
            type="text"
            required
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="cth: Kompetisi bulanan"
            className="field"
          />
        </label>

        <div>
          <div className="label">Atur kategori & bobot poin</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Mabar Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("mabar")}
              aria-pressed={activeTab === "mabar"}
              className={`text-left border-none rounded-[14px] p-5 font-sans flex gap-3 items-start transition-all cursor-pointer ${
                activeTab === "mabar"
                  ? "bg-volt/10 ring-2 ring-volt text-snow"
                  : "bg-ink-3 ring-1 ring-snow/12 hover:ring-snow/25 text-snow"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex-none mt-0.5 box-border border-2 flex items-center justify-center transition-colors ${
                  activeTab === "mabar" ? "border-volt" : "border-snow/50"
                }`}
              >
                {activeTab === "mabar" && (
                  <span className="w-2.5 h-2.5 rounded-full bg-volt" />
                )}
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-display font-bold text-[19px]">Mabar</span>
                <span className="text-[13px] leading-[1.5] text-snow/75">
                  Poin berdasarkan posisi klasemen akhir ({mabarItems.filter((i) => i.checked).length} aktif).
                </span>
              </span>
            </button>

            {/* Kompetisi Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("kompetisi")}
              aria-pressed={activeTab === "kompetisi"}
              className={`text-left border-none rounded-[14px] p-5 font-sans flex gap-3 items-start transition-all cursor-pointer ${
                activeTab === "kompetisi"
                  ? "bg-volt/10 ring-2 ring-volt text-snow"
                  : "bg-ink-3 ring-1 ring-snow/12 hover:ring-snow/25 text-snow"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex-none mt-0.5 box-border border-2 flex items-center justify-center transition-colors ${
                  activeTab === "kompetisi" ? "border-volt" : "border-snow/50"
                }`}
              >
                {activeTab === "kompetisi" && (
                  <span className="w-2.5 h-2.5 rounded-full bg-volt" />
                )}
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-display font-bold text-[19px]">
                  Kompetisi
                </span>
                <span className="text-[13px] leading-[1.5] text-snow/75">
                  Poin berdasarkan tahap tertinggi yang dicapai ({kompetisiItems.filter((i) => i.checked).length} aktif).
                </span>
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Winner Categories Section */}
      <section className="bg-ink-2 rounded-2xl p-5 md:p-[22px_24px] flex flex-col">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <div className="font-display font-bold text-lg text-snow">
            {activeTab === "kompetisi"
              ? "Kategori pemenang · Kompetisi"
              : "Kategori pemenang · Mabar"}
          </div>
          <span className="text-xs text-snow/50">
            Kategori kedua tipe event akan disimpan ke preset ini.
          </span>
        </div>
        <div className="text-[13px] text-snow/70 mt-0.5 mb-2">
          {activeTab === "kompetisi"
            ? "Centang kategori yang dapat poin. Tiap pemain di tim dapat poin tahap tertinggi yang dicapai."
            : "Centang kategori yang dapat poin. Poin diberikan ke tiap pemain sesuai posisi di klasemen akhir."}
        </div>

        {activeItems.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 py-2.5 border-t border-snow/8 transition-opacity ${
              item.checked ? "opacity-100" : "opacity-55"
            }`}
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => handleToggleCheck(item.id)}
              aria-label={`Pakai kategori ${item.name}`}
              className="w-5 h-5 accent-volt flex-none cursor-pointer"
            />

            <div className="flex-1 min-w-0">
              {item.isCustom ? (
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleCustomNameChange(item.id, e.target.value)}
                  placeholder="Nama kategori"
                  aria-label="Nama kategori"
                  className="field min-h-[40px] font-bold"
                />
              ) : (
                <>
                  <div className="font-bold text-[15px] text-snow">{item.name}</div>
                  {item.desc && (
                    <div className="text-[13px] text-snow/70 mt-0.5">
                      {item.desc}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-end bg-snow/10 rounded-lg px-3 min-h-[44px] focus-within:ring-2 focus-within:ring-volt w-28 md:w-32 flex-none gap-1.5 transition-all">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                value={item.points}
                onFocus={(e) => e.target.select()}
                onChange={(e) => handlePointChange(item.id, e.target.value)}
                onBlur={() => handlePointBlur(item.id)}
                aria-label={`Poin ${item.name}`}
                className="w-full bg-transparent text-right font-display font-bold text-lg text-snow outline-none placeholder:text-snow/30"
              />
              <span className="text-[13px] text-snow/70 flex-none select-none">
                poin
              </span>
            </div>

            {item.isCustom ? (
              <button
                type="button"
                onClick={() => handleDeleteItem(item.id)}
                title="Hapus kategori"
                aria-label="Hapus kategori"
                className="text-snow/50 hover:text-coral transition-colors flex-none p-1 cursor-pointer"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="4 7 20 7" />
                  <path d="M9 7V4h6v3" />
                  <path d="M6 7l1 13h10l1-13" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            ) : (
              <span className="w-[18px] flex-none" />
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={handleAddCategory}
          className="mt-2 border border-dashed border-snow/30 rounded-lg bg-transparent text-snow min-h-[44px] font-sans font-bold text-sm hover:border-snow/60 hover:bg-snow/5 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          + Tambah kategori
        </button>
      </section>

      {/* Footer Buttons */}
      <div className="flex justify-end items-center gap-2 pt-1">
        <Link
          href={backUrl}
          className="btn bg-transparent text-snow/85 hover:bg-snow/8 no-underline"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          data-loading={isSubmitting || undefined}
          className="btn btn-coral text-ink font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
        >
          {isEditMode ? "Simpan perubahan" : "Simpan preset"}
        </button>
      </div>
    </form>
  );
}
