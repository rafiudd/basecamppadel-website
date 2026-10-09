"use client";

import { useState } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { Modal } from "@/components/ui/Modal";
import { deleteAccount } from "@/app/akun/actions";

/** Hapus akun: the dialog only lets go once the player types HAPUS. */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="bg-transparent border-none p-0 text-sm font-semibold text-loss hover:underline">
        Hapus akun
      </button>
      {open && (
        <Modal title="Hapus akun?" onClose={() => setOpen(false)} width={440}>
          <p className="text-sm leading-relaxed text-snow/80 m-0">
            Login dan profil kamu dihapus permanen. Hasil pertandingan dan poin yang sudah tercatat tetap ada di
            leaderboard. Ketik <b className="text-snow">HAPUS</b> untuk konfirmasi.
          </p>
          <ActionForm action={deleteAccount} successText="Akun dihapus" className="flex flex-col gap-4">
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
    </>
  );
}
