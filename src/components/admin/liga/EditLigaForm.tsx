"use client";

import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import { updateLeague, deleteLeague } from "@/app/admin/liga/actions";
import type { LeagueWithVolumes } from "@/lib/leagues";

export function EditLigaForm({ league }: { league: LeagueWithVolumes }) {
  return (
    <div className="flex flex-col gap-6">
      <ActionForm action={updateLeague} successText="Liga berhasil diperbarui" className="flex flex-col gap-5">
        <input type="hidden" name="league_id" value={league.id} />

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
          <button type="submit" className="btn btn-coral text-ink min-h-11 font-bold">
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
