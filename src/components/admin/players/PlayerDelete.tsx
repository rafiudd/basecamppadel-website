"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { TrashIcon } from "@/components/ui/icons";
import { ActionForm } from "@/components/admin/ActionForm";
import { footprintParts, type PlayerFootprint } from "@/lib/playerMerge";
import { deletePlayer, playerDeleteImpact } from "@/app/admin/actions";
import type { Player } from "@/lib/database.types";

/**
 * Trash button → a dialog that first counts what the delete takes with it (match history, points,
 * coaching, …). A player with data is usually a duplicate, so "Gabungkan" is offered next to it:
 * that keeps the data by moving it to the right player.
 */
export function PlayerDelete({ player, onMerge }: { player: Player; onMerge: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Hapus ${player.name}`} className="w-10 h-10 rounded-lg bg-transparent border-none text-snow/70 hover:text-loss flex items-center justify-center p-0 flex-none">
        <TrashIcon />
      </button>
      {open && (
        <DeleteDialog
          player={player}
          onClose={() => setOpen(false)}
          onMerge={() => {
            setOpen(false);
            onMerge();
          }}
        />
      )}
    </>
  );
}

function DeleteDialog({ player, onClose, onMerge }: { player: Player; onClose: () => void; onMerge: () => void }) {
  const [footprint, setFootprint] = useState<PlayerFootprint | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    playerDeleteImpact(player.id).then((res) => ("footprint" in res ? setFootprint(res.footprint) : setError(res.error)));
  }, [player.id]);

  const parts = footprint ? footprintParts(footprint) : [];
  return (
    <Modal title={`Hapus ${player.name}?`} onClose={onClose} width={480}>
      {!footprint && !error && <div className="text-caption text-snow/60 flex items-center gap-2"><Spinner label={null} /> Mengecek data pemain…</div>}
      {error && <div role="alert" className="text-sm text-coral-soft">{error}</div>}
      {footprint && (parts.length || footprint.accountEmail ? (
        <div className="flex flex-col gap-2.5 text-sm">
          {parts.length > 0 && (
            <div className="bg-loss/12 rounded-xl px-4 py-3 text-coral-soft">
              Ikut terhapus permanen: <b>{parts.join(" · ")}</b>. Poin dan riwayatnya tidak bisa dikembalikan.
            </div>
          )}
          {footprint.accountEmail && <div className="text-snow/75">Akun {footprint.accountEmail} akan terlepas dari pemain ini.</div>}
          <div className="text-snow/75">Kalau ini pemain duplikat, pakai <b className="text-snow">Gabungkan</b>: datanya dipindah ke pemain yang benar, tidak dibuang.</div>
        </div>
      ) : (
        <div className="text-sm text-snow/75">Pemain ini belum punya data match, event, atau coaching.</div>
      ))}
      <ActionForm action={deletePlayer} successText="Pemain dihapus" onSuccess={onClose} className="flex justify-end gap-2 flex-wrap">
        <input type="hidden" name="id" value={player.id} />
        <button type="button" onClick={onClose} className="btn bg-transparent text-snow/85 min-h-11">Batal</button>
        <button type="button" onClick={onMerge} className="btn btn-volt min-h-11">Gabungkan…</button>
        <button type="submit" disabled={!footprint && !error} className="btn btn-danger min-h-11">Hapus permanen</button>
      </ActionForm>
    </Modal>
  );
}
