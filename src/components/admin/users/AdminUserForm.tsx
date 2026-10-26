import { ActionForm } from "@/components/admin/ActionForm";
import { createAdminUser, updateAdminUser } from "@/app/admin/users/actions";
import { PasswordInput } from "@/components/ui/PasswordInput";

export type AdminUserItem = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  created_at: string;
};

export function AdminUserForm({
  admin,
  onClose,
}: {
  admin?: AdminUserItem;
  onClose?: () => void;
}) {
  const isEdit = Boolean(admin);

  return (
    <ActionForm
      action={async (state, fd) => {
        const res = await (isEdit ? updateAdminUser : createAdminUser)(state, fd);
        if (!res?.error) {
          onClose?.();
        }
        return res;
      }}
      successText={isEdit ? "Admin berhasil diperbarui" : "Admin berhasil ditambahkan"}
      onSuccess={onClose}
      className="flex flex-col gap-4"
    >
      {admin && <input type="hidden" name="id" value={admin.id} />}

      <div>
        <div className="label">Nama / Label</div>
        <input
          className="field"
          name="name"
          required
          defaultValue={admin?.name ?? ""}
          placeholder="Nama Admin"
          autoFocus
        />
      </div>

      <div>
        <div className="label">Email Login</div>
        <input
          className="field"
          name="email"
          type="email"
          required={!isEdit}
          defaultValue={admin?.email ?? ""}
          readOnly={isEdit}
          placeholder="admin@basecamppadel.com"
          autoComplete="email"
        />
        {isEdit && (
          <div className="text-2xs text-snow/50 mt-1">
            Email login tidak dapat diubah setelah dibuat.
          </div>
        )}
      </div>

      <div>
        <div className="label">
          {isEdit ? "Password Baru (Opsional)" : "Password Login"}
        </div>
        <PasswordInput
          name="password"
          required={!isEdit}
          minLength={6}
          placeholder={isEdit ? "Kosongkan jika tidak ingin mengubah password" : "Minimal 6 karakter"}
          autoComplete={isEdit ? "new-password" : "current-password"}
        />
        {isEdit && (
          <div className="text-2xs text-snow/50 mt-1">
            Isi hanya jika ingin mengganti atau mereset password akun ini.
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-snow/10">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="btn bg-transparent text-snow/85 min-h-10"
          >
            Batal
          </button>
        )}
        <button className="btn btn-coral min-h-10 text-ink" type="submit">
          {isEdit ? "Simpan Perubahan" : "Tambah Super Admin"}
        </button>
      </div>
    </ActionForm>
  );
}
