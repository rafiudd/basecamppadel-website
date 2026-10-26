"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { ActionForm } from "@/components/admin/ActionForm";
import { ScoreKeeperForm, type ScoreKeeperItem } from "@/components/admin/users/ScoreKeeperForm";
import { deleteScoreKeeper } from "@/app/admin/users/actions";
import { MOBILE_CARD } from "@/components/admin/cardStyles";
import { ActiveBadge } from "@/components/ui/Badge";
import { TrashIcon } from "@/components/ui/icons";
import { formatDateShortIndo } from "@/lib/format";

export function ScoreKeeperClient({
  scorekeepers,
}: {
  scorekeepers: ScoreKeeperItem[];
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingSk, setEditingSk] = useState<ScoreKeeperItem | null>(null);
  const [deletingSk, setDeletingSk] = useState<ScoreKeeperItem | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const activeCount = scorekeepers.filter((s) => s.active).length;

  const closeModal = () => {
    setIsCreating(false);
    setEditingSk(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Score Keeper"
        description={`${activeCount} dari ${scorekeepers.length} akun aktif. Score Keeper hanya memiliki akses ke menu Live (/admin/live) untuk mengontrol skor pertandingan.`}
        actions={
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="btn btn-coral text-ink tracking-button whitespace-nowrap"
          >
            + Tambah Score Keeper
          </button>
        }
      />

      <div>
        <table className="hidden md:table w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-snow/65 uppercase tracking-table">
              <th className="pb-2.5 pr-3 font-semibold">Nama</th>
              <th className="pb-2.5 pr-3 font-semibold">Email Login</th>
              <th className="pb-2.5 pr-3 font-semibold">Status</th>
              <th className="pb-2.5 pr-3 font-semibold">Tanggal Dibuat</th>
              <th className="pb-2.5 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {scorekeepers.map((sk) => (
              <tr key={sk.id} className="border-t border-snow/10">
                <td className="py-3 pr-3 font-display font-bold whitespace-nowrap">
                  <span className={sk.active ? "" : "text-snow/50"}>{sk.name}</span>
                </td>
                <td className="py-3 pr-3 text-snow/80 whitespace-nowrap">
                  {sk.email}
                </td>
                <td className="py-3 pr-3 whitespace-nowrap">
                  <ActiveBadge active={sk.active} />
                </td>
                <td className="py-3 pr-3 text-snow/60 text-xs whitespace-nowrap">
                  {formatDateShortIndo(sk.created_at)}
                </td>
                <td className="py-2 text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingSk(sk)}
                      className="btn min-h-10 px-4 tracking-button text-snow"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingSk(sk)}
                      aria-label={`Hapus ${sk.name}`}
                      className="w-10 h-10 rounded-lg bg-transparent border-none text-snow/70 hover:text-loss flex items-center justify-center p-0 flex-none"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="md:hidden flex flex-col gap-2">
          {scorekeepers.map((sk) => (
            <div key={sk.id} className={`${MOBILE_CARD} flex flex-col gap-3`}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-display font-bold text-base flex items-center gap-2">
                  <span className={sk.active ? "" : "text-snow/50"}>{sk.name}</span>
                  <ActiveBadge active={sk.active} />
                </div>
                <div className="text-2xs text-snow/50">{formatDateShortIndo(sk.created_at)}</div>
              </div>
              <div className="text-sm text-snow/80">{sk.email}</div>
              <div className="flex items-center gap-2 justify-end pt-2 border-t border-snow/8">
                <button
                  type="button"
                  onClick={() => setEditingSk(sk)}
                  className="btn min-h-9 px-4 tracking-button text-snow text-xs"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingSk(sk)}
                  aria-label={`Hapus ${sk.name}`}
                  className="w-9 h-9 rounded-lg bg-transparent border-none text-snow/70 hover:text-loss flex items-center justify-center p-0 flex-none"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>

        {scorekeepers.length === 0 && (
          <p className="text-sm text-snow/50 mt-3">Belum ada akun score keeper.</p>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(isCreating || editingSk) && (
        <Modal
          title={editingSk ? `Edit ${editingSk.name}` : "Tambah Score Keeper"}
          onClose={closeModal}
          width={480}
        >
          <ScoreKeeperForm
            key={editingSk?.id ?? "new"}
            scorekeeper={editingSk ?? undefined}
            onClose={closeModal}
          />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSk && (
        <Modal
          title="Hapus Score Keeper"
          onClose={() => setDeletingSk(null)}
          width={420}
        >
          <ActionForm
            action={async (state, fd) => {
              const res = await deleteScoreKeeper(state, fd);
              if (!res?.error) {
                setDeletingSk(null);
              }
              return res;
            }}
            successText="Score keeper berhasil dihapus"
            onSuccess={() => setDeletingSk(null)}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="id" value={deletingSk.id} />
            <p className="text-sm leading-relaxed text-snow/80 m-0">
              Apakah Anda yakin ingin menghapus akun score keeper{" "}
              <strong className="text-snow">{deletingSk.name}</strong> ({deletingSk.email})?
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSk(null)}
                className="btn bg-transparent text-snow/85 min-h-10"
              >
                Batal
              </button>
              <button type="submit" className="btn btn-danger min-h-10">
                Ya, Hapus
              </button>
            </div>
          </ActionForm>
        </Modal>
      )}
    </div>
  );
}
