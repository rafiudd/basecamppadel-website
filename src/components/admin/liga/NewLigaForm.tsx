"use client";

import { useState } from "react";
import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import { createLeague } from "@/app/admin/liga/actions";

interface PresetItem {
  id: string;
  name: string;
}

export function NewLigaForm({ presets }: { presets: PresetItem[] }) {
  const [volumeCount, setVolumeCount] = useState(3);

  const decVolume = () => setVolumeCount((c) => Math.max(1, c - 1));
  const incVolume = () => setVolumeCount((c) => Math.min(10, c + 1));

  // Find East League or first preset
  const defaultPreset = presets.find((p) => p.name.toLowerCase().includes("east league"))?.id ?? presets[0]?.id ?? "";

  return (
    <ActionForm action={createLeague} successText="Liga berhasil dibuat" className="flex flex-col gap-5">
      <input type="hidden" name="total_volumes" value={volumeCount} />

      <section className="bg-ink-2 rounded-panel p-5 md:p-7 flex flex-col gap-4.5 border border-snow/5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <div className="text-2xs tracking-caps text-snow/65 uppercase mb-2 font-medium">Nama liga</div>
            <input
              name="name"
              required
              defaultValue="East Padel League"
              placeholder="Contoh: East Padel League"
              className="field min-h-11"
            />
          </label>
          <label className="block">
            <div className="text-2xs tracking-caps text-snow/65 uppercase mb-2 font-medium">Penyelenggara</div>
            <input
              name="organizer"
              defaultValue="East Padel House"
              placeholder="Contoh: East Padel House"
              className="field min-h-11"
            />
          </label>
        </div>

        <label className="block">
          <div className="text-2xs tracking-caps text-snow/65 uppercase mb-2 font-medium">Deskripsi singkat</div>
          <textarea
            name="description"
            rows={4}
            defaultValue="Arena untuk membuktikan sejauh mana kamu berkembang. Prove your improvement."
            placeholder="Deskripsi atau tagline liga..."
            className="field min-h-[108px] md:min-h-[120px] resize-y leading-relaxed py-2.5 px-3.5"
          />
        </label>

        {/* Volume Stepper */}
        <div className="flex items-center justify-between gap-3 pt-3.5 border-t border-snow/8">
          <div>
            <div className="font-bold text-input text-snow">Jumlah volume</div>
            <div className="text-caption text-snow/70 mt-0.5">Volume terakhir otomatis jadi Final.</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={decVolume}
              aria-label="Kurangi volume"
              disabled={volumeCount <= 1}
              className="w-11 h-11 border-none rounded-lg bg-snow/12 text-snow text-xl font-bold flex items-center justify-center hover:bg-snow/20 disabled:opacity-40 transition-colors"
            >
              −
            </button>
            <span className="font-display font-bold text-title text-snow min-w-[32px] text-center">
              {volumeCount}
            </span>
            <button
              type="button"
              onClick={incVolume}
              aria-label="Tambah volume"
              disabled={volumeCount >= 10}
              className="w-11 h-11 border-none rounded-lg bg-snow/12 text-snow text-xl font-bold flex items-center justify-center hover:bg-snow/20 disabled:opacity-40 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="pt-3.5 border-t border-snow/8">
          <label className="block">
            <div className="text-2xs tracking-caps text-snow/65 uppercase mb-2 font-medium">Preset poin per volume</div>
            <select
              name="point_preset_id"
              defaultValue={defaultPreset}
              className="field min-h-11"
            >
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="text-xs text-snow/60 mt-1.5 leading-normal">
              Poin dihitung per pemain, dijumlah dari semua volume.
            </div>
          </label>
        </div>
      </section>

      <div className="flex justify-end gap-2.5">
        <Link href="/admin/liga" className="btn min-h-11 inline-flex items-center justify-center no-underline">
          Batal
        </Link>
        <button type="submit" className="btn btn-coral text-ink min-h-11 font-bold">
          Simpan liga
        </button>
      </div>
    </ActionForm>
  );
}
