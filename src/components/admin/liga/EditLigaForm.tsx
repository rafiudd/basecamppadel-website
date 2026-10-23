"use client";

import { useState } from "react";
import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import { updateLeague, deleteLeague } from "@/app/admin/liga/actions";
import type { LeagueWithVolumes } from "@/lib/leagues";

export function EditLigaForm({ league, presets }: { league: LeagueWithVolumes; presets: { id: string; name: string }[] }) {
  const [volumeCount, setVolumeCount] = useState(league.total_volumes);
  // volumes that would be cut by the new count but already have an event: they must be deleted by hand first
  const blocked = league.volumes.filter((v) => v.volume_number > volumeCount && v.event_id);

  return (
    <div className="flex flex-col gap-6">
      <ActionForm action={updateLeague} successText="Liga berhasil diperbarui" className="flex flex-col gap-5">
        <input type="hidden" name="league_id" value={league.id} />
        <input type="hidden" name="total_volumes" value={volumeCount} />

        <section className="bg-ink-2 rounded-panel p-5 md:p-7 flex flex-col gap-4 border border-snow/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-2xs tracking-caps text-snow/65 uppercase mb-2 font-medium">Nama liga</div>
              <input
                name="name"
                required
                defaultValue={league.name}
                className="field min-h-11"
              />
            </label>
            <label className="block">
              <div className="text-2xs tracking-caps text-snow/65 uppercase mb-2 font-medium">Penyelenggara</div>
              <input
                name="organizer"
                defaultValue={league.organizer}
                className="field min-h-11"
              />
            </label>
          </div>

          <label className="block">
            <div className="text-2xs tracking-caps text-snow/65 uppercase mb-2 font-medium">Deskripsi singkat</div>
            <textarea
              name="description"
              rows={4}
              defaultValue={league.description}
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
                onClick={() => setVolumeCount((c) => Math.max(1, c - 1))}
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
                onClick={() => setVolumeCount((c) => Math.min(10, c + 1))}
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
              <select name="point_preset_id" defaultValue={league.point_preset_id ?? ""} className="field min-h-11">
                {!league.point_preset_id && <option value="">Default (25 / 20 / 15 / 5 / 1)</option>}
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="text-xs text-snow/60 mt-1.5 leading-normal">
                Mengganti preset langsung menghitung ulang klasemen liga dari semua volume. Poin di event tiap volume tidak berubah.
              </div>
            </label>
          </div>

          {blocked.length > 0 && (
            <div role="alert" className="rounded-xl bg-loss/12 border border-loss/25 px-4 py-3 text-sm flex flex-col gap-2">
              <div className="font-semibold text-loss">
                Tidak bisa dikurangi ke {volumeCount} volume.
              </div>
              <div className="text-snow/80 leading-normal">
                Volume berikut sudah punya event. Hapus event-nya secara manual dulu, lalu kurangi volume.
              </div>
              <ul className="m-0 pl-0 list-none flex flex-col gap-1.5">
                {blocked.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3">
                    <span className="text-snow min-w-0 truncate">
                      <span className="font-semibold">Vol. {v.volume_number}</span> · {v.event?.title ?? "Event"}
                    </span>
                    <Link href={`/admin/events/${v.event_id}`} className="text-xs font-semibold text-snow/80 hover:text-volt whitespace-nowrap no-underline">
                      Buka event →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <label className="flex items-center gap-2.5 pt-2 cursor-pointer">
            <input
              type="checkbox"
              name="published"
              defaultChecked={league.published}
              className="w-4 h-4 rounded accent-coral"
            />
            <span className="text-sm font-medium text-snow">Tampilkan di halaman publik</span>
          </label>
        </section>

        <div className="flex justify-between items-center gap-3">
          <Link href={`/admin/liga/${league.id}`} className="btn min-h-11 inline-flex items-center no-underline">
            Batal
          </Link>
          <button type="submit" disabled={blocked.length > 0} className="btn btn-coral text-ink min-h-11 font-bold disabled:opacity-40">
            Simpan Perubahan
          </button>
        </div>
      </ActionForm>

      {/* Danger Zone: Delete League */}
      <section className="bg-loss/10 rounded-panel p-5 md:p-6 border border-loss/20 flex flex-col gap-3 mt-4">
        <div className="font-display font-bold text-title-sm text-loss">Hapus Liga</div>
        <p className="text-sm text-snow/70 m-0">
          Menghapus liga ini tidak akan menghapus event yang sudah dibuat, namun relasi volume dan klasemen liga akan hilang.
        </p>
        <div className="flex justify-end pt-2">
          <ActionForm
            action={deleteLeague}
            confirmText="Yakin ingin menghapus liga ini? Tindakan ini tidak dapat dibatalkan."
            confirmLabel="Ya, Hapus Liga"
          >
            <input type="hidden" name="league_id" value={league.id} />
            <button type="submit" className="btn btn-danger text-loss min-h-10 text-xs">
              Hapus Liga
            </button>
          </ActionForm>
        </div>
      </section>
    </div>
  );
}
