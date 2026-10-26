"use client";

import { useState } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import {
  createPlayerLogin,
  resetPlayerPassword,
  unlinkPlayerAccount,
} from "@/app/admin/users/actions";

export function PlayerLoginManagement({
  playerId,
  playerName,
  accountEmail,
}: {
  playerId: string;
  playerName: string;
  accountEmail: string | null;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [showReset, setShowReset] = useState(false);

  return (
    <div className="bg-ink-2 rounded-2xl p-5 md:p-6 flex flex-col gap-4 border border-snow/8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-display font-bold text-base text-snow">Manajemen Akun Login</div>
          <div className="text-xs text-snow/60 mt-0.5">
            Kelola akses login pemain untuk mengakses profil dan data mereka.
          </div>
        </div>
        {accountEmail ? (
          <span className="flex items-center gap-1.5 text-xs text-volt bg-volt/10 px-2.5 py-1 rounded-full font-medium flex-none">
            <span className="w-2 h-2 rounded-full bg-volt" />
            Terhubung
          </span>
        ) : (
          <span className="text-xs text-snow/40 bg-snow/5 px-2.5 py-1 rounded-full flex-none">
            Belum Ada Akun
          </span>
        )}
      </div>

      {accountEmail ? (
        <div className="flex flex-col gap-4 pt-2 border-t border-snow/8">
          <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
            <div>
              <span className="text-snow/60">Email akun: </span>
              <b className="text-snow">{accountEmail}</b>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowReset((v) => !v)}
                className="btn min-h-9 px-3 text-xs bg-snow/10 hover:bg-snow/15 text-snow"
              >
                {showReset ? "Tutup Form Reset" : "Reset Password"}
              </button>
            </div>
          </div>

          {showReset && (
            <ActionForm
              action={resetPlayerPassword}
              successText="Password akun pemain berhasil direset"
              className="p-4 rounded-xl bg-ink/60 border border-snow/10 flex flex-col gap-3"
            >
              <input type="hidden" name="player_id" value={playerId} />
              <div className="font-semibold text-xs text-snow">Reset Password Akun ({accountEmail})</div>
              <div>
                <div className="label">Password Baru</div>
                <input
                  className="field"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimal 6 karakter"
                  autoComplete="new-password"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowReset(false)}
                  className="btn bg-transparent text-snow/70 text-xs px-3"
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-coral text-xs px-4">
                  Simpan Password
                </button>
              </div>
            </ActionForm>
          )}

          <div className="pt-2 border-t border-snow/8 flex items-center justify-between gap-4 text-xs">
            <span className="text-snow/50">
              Ingin memutuskan tautan akun dari data pemain ini?
            </span>
            <ActionForm
              action={unlinkPlayerAccount}
              successText="Tautan akun berhasil dilepas dari pemain"
            >
              <input type="hidden" name="player_id" value={playerId} />
              <button
                type="submit"
                className="btn bg-transparent border border-loss/30 text-loss hover:bg-loss/10 text-xs px-3 py-1.5"
              >
                Putus Tautan
              </button>
            </ActionForm>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pt-2 border-t border-snow/8">
          <p className="text-sm text-snow/65 m-0">
            Pemain <b>{playerName}</b> belum memiliki akun login. Anda dapat membuatkan akun login dengan email dan password secara langsung.
          </p>

          {!showCreate ? (
            <div>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="btn btn-coral text-ink text-xs px-4 py-2 font-semibold"
              >
                + Buat Akun Login Pemain
              </button>
            </div>
          ) : (
            <ActionForm
              action={createPlayerLogin}
              successText="Akun login pemain berhasil dibuat dan ditautkan"
              className="p-4 rounded-xl bg-ink/60 border border-snow/10 flex flex-col gap-3"
            >
              <input type="hidden" name="player_id" value={playerId} />
              <div className="font-semibold text-xs text-snow">Buat Akun Baru untuk {playerName}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="label">Email Login</div>
                  <input
                    className="field"
                    name="email"
                    type="email"
                    required
                    placeholder="pemain@email.com"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <div className="label">Password Awal</div>
                  <input
                    className="field"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="btn bg-transparent text-snow/70 text-xs px-3"
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-coral text-xs px-4">
                  Buat Akun
                </button>
              </div>
            </ActionForm>
          )}
        </div>
      )}
    </div>
  );
}
