"use client";

import { useState } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { Modal } from "@/components/ui/Modal";
import { deleteAccount } from "@/app/akun/actions";
import type { ActionState } from "@/lib/actionState";
import { GoogleAccount } from "./ProfileForm";
import { lightCard, sectionHeading } from "./styles";

/**
 * "Akun" card under the Edit profil form: the Google login (email can't change, A.4) and Hapus akun
 * (A.5), whose dialog only lets go once the player types HAPUS.
 */
export function AccountSettings({
  name,
  email,
  photoUrl,
  action = deleteAccount,
}: {
  name: string;
  email: string;
  photoUrl?: string | null;
  action?: (state: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  return (
    <section className={`${lightCard} flex flex-col gap-5 text-ink`}>
      <div>
        <h2 className={sectionHeading}>Akun</h2>
        <p className="m-0 mt-1 text-caption text-ink/60">Kamu masuk pakai akun Google ini. Email-nya tidak bisa diubah.</p>
      </div>
      <GoogleAccount name={name} email={email} photoUrl={photoUrl} />

      <div className="border-t border-ink/10 pt-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
        <div className="flex-1">
          <div className="font-semibold text-sm">Hapus akun</div>
          <p className="m-0 mt-0.5 text-caption text-ink/60 leading-copy">
            Login dan profil kamu dihapus permanen. Hasil pertandingan dan poin yang sudah tercatat tetap ada di leaderboard.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center min-h-11 px-5.5 rounded-full border border-loss/40 bg-white text-loss font-semibold text-sm whitespace-nowrap hover:bg-loss/5"
        >
          Hapus akun
        </button>
      </div>

      {open && (
        <Modal title="Hapus akun?" onClose={() => setOpen(false)} width={440}>
          <p className="text-sm leading-relaxed text-snow/80 m-0">
            Login dan profil kamu dihapus permanen. Hasil pertandingan dan poin yang sudah tercatat tetap ada di
            leaderboard. Ketik <b className="text-snow">HAPUS</b> untuk konfirmasi.
          </p>
          <ActionForm action={action} successText="Akun dihapus" className="flex flex-col gap-4">
            <input
              name="confirm"
              className="field"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="HAPUS"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-label='Ketik "HAPUS"'
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn bg-transparent text-snow/85 min-h-10">
                Batal
              </button>
              <button type="submit" disabled={typed !== "HAPUS"} className="btn min-h-10 bg-loss text-snow">
                Hapus akun
              </button>
            </div>
          </ActionForm>
        </Modal>
      )}
    </section>
  );
}
