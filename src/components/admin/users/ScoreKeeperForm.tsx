import { ActionForm } from "@/components/admin/ActionForm";
import { createScoreKeeper, updateScoreKeeper } from "@/app/admin/users/actions";
import { PasswordInput } from "@/components/ui/PasswordInput";

export type ScoreKeeperItem = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  active: boolean;
  created_at: string;
};

export function ScoreKeeperForm({
  scorekeeper,
  onClose,
}: {
  scorekeeper?: ScoreKeeperItem;
  onClose?: () => void;
}) {
  const isEdit = Boolean(scorekeeper);

  return (
    <ActionForm
      action={async (state, fd) => {
        const res = await (isEdit ? updateScoreKeeper : createScoreKeeper)(state, fd);
        if (!res?.error) {
          onClose?.();
        }
        return res;
      }}
      successText={isEdit ? "Score keeper berhasil diperbarui" : "Score keeper berhasil ditambahkan"}
      onSuccess={onClose}
      className="flex flex-col gap-4"
    >
      {scorekeeper && <input type="hidden" name="id" value={scorekeeper.id} />}

      <div>
        <div className="label">Nama / Operator</div>
        <input
          className="field"
          name="name"
          required
          defaultValue={scorekeeper?.name ?? ""}
          placeholder="Nama Score Keeper / Petugas Lapangan"
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
          defaultValue={scorekeeper?.email ?? ""}
          readOnly={isEdit}
          placeholder="scorekeeper@basecamppadel.com"
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

      {isEdit && (
        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            name="active"
            defaultChecked={scorekeeper?.active ?? true}
            className="w-4 h-4 rounded accent-coral"
          />
          <span>Status Akun Aktif (diizinkan login)</span>
        </label>
      )}

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
          {isEdit ? "Simpan Perubahan" : "Tambah Score Keeper"}
        </button>
      </div>
    </ActionForm>
  );
}
