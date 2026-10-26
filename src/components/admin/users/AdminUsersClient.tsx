"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { ActionForm } from "@/components/admin/ActionForm";
import { AdminUserForm, type AdminUserItem } from "@/components/admin/users/AdminUserForm";
import { deleteAdminUser } from "@/app/admin/users/actions";
import { MOBILE_CARD } from "@/components/admin/cardStyles";
import { Badge } from "@/components/ui/Badge";
import { TrashIcon } from "@/components/ui/icons";
import { formatDateShortIndo } from "@/lib/format";

export function AdminUsersClient({
  admins,
  currentUserId,
}: {
  admins: AdminUserItem[];
  currentUserId: string;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUserItem | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState<AdminUserItem | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const closeModal = () => {
    setIsCreating(false);
    setEditingAdmin(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Super Admin"
        description={`${admins.length} akun terdaftar. Super Admin memiliki hak akses penuh ke seluruh pengaturan dan data sistem.`}
        actions={
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="btn btn-coral text-ink tracking-button whitespace-nowrap"
          >
            + Tambah Admin
          </button>
        }
      />

      <div>
        <table className="hidden md:table w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-snow/65 uppercase tracking-table">
              <th className="pb-2.5 pr-3 font-semibold">Nama</th>
              <th className="pb-2.5 pr-3 font-semibold">Email Login</th>
              <th className="pb-2.5 pr-3 font-semibold">Tanggal Dibuat</th>
              <th className="pb-2.5 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((adm) => {
              const isCurrent = adm.user_id === currentUserId;
              return (
                <tr key={adm.id} className="border-t border-snow/10">
                  <td className="py-3 pr-3 font-display font-bold whitespace-nowrap">
                    <span className="flex items-center gap-2">
                      {adm.name}
                      {isCurrent && <Badge tone="volt">Akun Anda</Badge>}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-snow/80 whitespace-nowrap">
                    {adm.email}
                  </td>
                  <td className="py-3 pr-3 text-snow/60 text-xs whitespace-nowrap">
                    {formatDateShortIndo(adm.created_at)}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingAdmin(adm)}
                        className="btn min-h-10 px-4 tracking-button text-snow"
                      >
                        Edit
                      </button>
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => setDeletingAdmin(adm)}
                          aria-label={`Hapus ${adm.name}`}
                          className="w-10 h-10 rounded-lg bg-transparent border-none text-snow/70 hover:text-loss flex items-center justify-center p-0 flex-none"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="md:hidden flex flex-col gap-2">
          {admins.map((adm) => {
            const isCurrent = adm.user_id === currentUserId;
            return (
              <div key={adm.id} className={`${MOBILE_CARD} flex flex-col gap-3`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display font-bold text-base flex items-center gap-2">
                    {adm.name}
                    {isCurrent && <Badge tone="volt">Akun Anda</Badge>}
                  </div>
                  <div className="text-2xs text-snow/50">{formatDateShortIndo(adm.created_at)}</div>
                </div>
                <div className="text-sm text-snow/80">{adm.email}</div>
                <div className="flex items-center gap-2 justify-end pt-2 border-t border-snow/8">
                  <button
                    type="button"
                    onClick={() => setEditingAdmin(adm)}
                    className="btn min-h-9 px-4 tracking-button text-snow text-xs"
                  >
                    Edit
                  </button>
                  {!isCurrent && (
                    <button
                      type="button"
                      onClick={() => setDeletingAdmin(adm)}
                      aria-label={`Hapus ${adm.name}`}
                      className="w-9 h-9 rounded-lg bg-transparent border-none text-snow/70 hover:text-loss flex items-center justify-center p-0 flex-none"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {admins.length === 0 && (
          <p className="text-sm text-snow/50 mt-3">Belum ada akun admin.</p>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(isCreating || editingAdmin) && (
        <Modal
          title={editingAdmin ? `Edit ${editingAdmin.name}` : "Tambah Super Admin"}
          onClose={closeModal}
          width={480}
          closeOnBackdropClick={false}
          closeOnEscape={false}
          showCloseButton={false}
        >
          <AdminUserForm
            key={editingAdmin?.id ?? "new"}
            admin={editingAdmin ?? undefined}
            onClose={closeModal}
          />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAdmin && (
        <Modal
          title="Hapus Super Admin"
          onClose={() => setDeletingAdmin(null)}
          width={420}
          closeOnBackdropClick={false}
          closeOnEscape={false}
          showCloseButton={false}
        >
          <ActionForm
            action={async (state, fd) => {
              const res = await deleteAdminUser(state, fd);
              if (!res?.error) {
                setDeletingAdmin(null);
              }
              return res;
            }}
            successText="Admin berhasil dihapus"
            onSuccess={() => setDeletingAdmin(null)}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="id" value={deletingAdmin.id} />
            <p className="text-sm leading-relaxed text-snow/80 m-0">
              Apakah Anda yakin ingin menghapus akun admin{" "}
              <strong className="text-snow">{deletingAdmin.name}</strong> ({deletingAdmin.email})?
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAdmin(null)}
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
