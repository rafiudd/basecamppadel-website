"use client";

import { useState } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { upsertCoachUser, unlinkCoachLogin } from "@/app/admin/users/actions";
import { PasswordInput } from "@/components/ui/PasswordInput";

export type CoachResume = {
  coachingSessionsCount: number;
  coachingGroupsCount: number;
  assessmentsCount: number;
  classesCount: number;
  classSchedulesCount: number;
  coachingSessions: Array<{
    id: string;
    title: string;
    session_date: string;
    venue_name?: string;
    status: string;
  }>;
  classes: Array<{
    id: string;
    title: string;
    category?: string | null;
    schedulesCount: number;
    isDefaultCoach: boolean;
  }>;
};

export type CoachUserItem = {
  id: string;
  name: string;
  active: boolean;
  user_id: string | null;
  email: string | null;
  created_at: string;
  resume?: CoachResume;
};

export function CoachUserForm({
  coach,
  onClose,
}: {
  coach?: CoachUserItem;
  onClose?: () => void;
}) {
  const isEdit = Boolean(coach);
  const [createLogin, setCreateLogin] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <ActionForm
        action={async (state, fd) => {
          const res = await upsertCoachUser(state, fd);
          if (!res?.error) {
            onClose?.();
          }
          return res;
        }}
        successText={isEdit ? "Data coach berhasil diperbarui" : "Coach berhasil ditambahkan"}
        onSuccess={onClose}
        className="flex flex-col gap-4"
      >
        {coach && <input type="hidden" name="id" value={coach.id} />}

        <div>
          <div className="label">Nama Coach</div>
          <input
            className="field"
            name="name"
            required
            defaultValue={coach?.name ?? ""}
            placeholder="mis. Coach Ardi"
            autoFocus
          />
        </div>

        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            name="active"
            defaultChecked={coach?.active ?? true}
            className="w-4 h-4 rounded accent-coral"
          />
          <span>Status Aktif (dapat ditugaskan pada sesi coaching & kelas)</span>
        </label>

        {/* Akun Login Section */}
        <div className="pt-3 border-t border-snow/10 flex flex-col gap-3">
          <div className="font-bold text-sm text-snow flex items-center justify-between">
            <span>Akses Login Coach</span>
            {coach?.email && (
              <span className="text-2xs font-normal text-volt bg-volt/10 px-2 py-0.5 rounded-full">
                Akun Terhubung
              </span>
            )}
          </div>

          {coach?.email ? (
            <div className="flex flex-col gap-3">
              <div>
                <div className="label">Email Login Terdaftar</div>
                <input
                  className="field bg-ink/40 text-snow/70 cursor-not-allowed"
                  name="email"
                  type="email"
                  defaultValue={coach.email}
                  readOnly
                />
              </div>

              <div>
                <div className="label">Reset Password (Opsional)</div>
                <PasswordInput
                  name="password"
                  minLength={6}
                  placeholder="Kosongkan jika tidak ingin mengubah password"
                  autoComplete="new-password"
                />
                <div className="text-2xs text-snow/50 mt-1">
                  Masukkan password baru jika coach lupa password atau ingin menggantinya.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={createLogin}
                  onChange={(e) => setCreateLogin(e.target.checked)}
                  className="w-4 h-4 rounded accent-coral"
                />
                <span className="font-semibold text-snow/90">
                  {isEdit ? "Buatkan Akun Login untuk Coach ini" : "Sekaligus buatkan akun login"}
                </span>
              </label>

              {createLogin && (
                <div className="p-3.5 rounded-xl bg-ink/50 border border-snow/10 flex flex-col gap-3">
                  <div>
                    <div className="label">Email Login Coach</div>
                    <input
                      className="field"
                      name="email"
                      type="email"
                      required={createLogin}
                      placeholder="coach@basecamppadel.com"
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <div className="label">Password Awal</div>
                    <PasswordInput
                      name="password"
                      required={createLogin}
                      minLength={6}
                      placeholder="Minimal 6 karakter"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              )}
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
            {isEdit ? "Simpan Perubahan" : "Tambah Coach"}
          </button>
        </div>
      </ActionForm>

      {/* Unlink Login option if already linked */}
      {isEdit && coach?.email && (
        <div className="bg-ink-2/60 border border-snow/10 rounded-2xl p-4 flex items-center justify-between gap-4 mt-1">
          <div>
            <div className="text-sm font-bold text-snow">Putus Tautan Akun Login</div>
            <div className="text-2xs text-snow/60 mt-0.5">
              Coach tetap ada di sistem, namun akun login ({coach.email}) akan dicabut aksesnya.
            </div>
          </div>
          <ActionForm
            action={async (state, fd) => {
              const res = await unlinkCoachLogin(state, fd);
              if (!res?.error) {
                onClose?.();
              }
              return res;
            }}
            successText="Tautan akun login coach dicabut"
            onSuccess={onClose}
          >
            <input type="hidden" name="id" value={coach.id} />
            <button type="submit" className="btn bg-transparent border border-loss/30 text-loss text-xs hover:bg-loss/10 whitespace-nowrap min-h-9 px-3">
              Putus Login
            </button>
          </ActionForm>
        </div>
      )}
    </div>
  );
}
