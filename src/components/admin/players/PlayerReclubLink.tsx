"use client";

import { useState } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { Avatar } from "@/components/ui/Avatar";
import { reclubAvatarUrl } from "@/lib/reclub";
import { unlinkPlayerReclub } from "@/app/admin/reclub/actions";
import type { Player } from "@/lib/database.types";

/**
 * Which Reclub account this player is linked to ("Ambil dari Reclub" puts that account straight
 * into this player), with a way out when the link was set on the wrong player.
 */
export function PlayerReclubLink({ player }: { player: Pick<Player, "id" | "name" | "reclub_user_id" | "reclub_name" | "reclub_username"> }) {
  const reclubId = player.reclub_user_id;
  // Reclub's avatar URL 404s for users without a photo: fall back to initials
  const [photoFailed, setPhotoFailed] = useState(false);
  const label = player.reclub_name || (player.reclub_username ? `@${player.reclub_username}` : `Akun Reclub #${reclubId}`);

  return (
    <div className="bg-ink-2 rounded-2xl p-5 md:p-6 flex flex-col gap-4 border border-snow/8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-display font-bold text-base text-snow">Tautan Reclub</div>
          <div className="text-xs text-snow/60 mt-0.5">
            Akun Reclub yang tertaut otomatis masuk sebagai pemain ini setiap kali peserta diambil dari Reclub.
          </div>
        </div>
        {reclubId != null ? (
          <span className="flex items-center gap-1.5 text-xs text-volt bg-volt/10 px-2.5 py-1 rounded-full font-medium flex-none">
            <span className="w-2 h-2 rounded-full bg-volt" />
            Terhubung
          </span>
        ) : (
          <span className="text-xs text-snow/40 bg-snow/5 px-2.5 py-1 rounded-full flex-none">Belum Tertaut</span>
        )}
      </div>

      {reclubId != null ? (
        <div className="flex flex-col gap-4 pt-2 border-t border-snow/8">
          <div className="flex items-center gap-3 min-w-0">
            {photoFailed ? (
              <Avatar name={label} size={40} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- Reclub's own avatar, shown as is
              <img src={reclubAvatarUrl(reclubId)} alt="" onError={() => setPhotoFailed(true)} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover bg-indigo flex-none" />
            )}
            <div className="min-w-0 text-sm">
              <div className="font-bold text-snow truncate">
                {label}
                {player.reclub_name && player.reclub_username && <span className="font-normal text-snow/55"> @{player.reclub_username}</span>}
              </div>
              <div className="text-xs text-snow/50">ID Reclub {reclubId}</div>
            </div>
          </div>

          <div className="pt-2 border-t border-snow/8 flex items-center justify-between gap-4 text-xs flex-wrap">
            <span className="text-snow/50">Salah tautan? Putuskan, lalu pilih pemain yang benar saat impor Reclub berikutnya.</span>
            <ActionForm
              action={unlinkPlayerReclub}
              successText="Tautan Reclub dilepas"
              confirmText={`Putuskan ${label} dari ${player.name}? Riwayat dan data pemain tidak berubah.`}
              confirmLabel="Putus Tautan"
              danger
            >
              <input type="hidden" name="player_id" value={player.id} />
              <button type="submit" className="btn bg-transparent border border-loss/30 text-loss hover:bg-loss/10 text-xs px-3 py-1.5">
                Putus Tautan
              </button>
            </ActionForm>
          </div>
        </div>
      ) : (
        <p className="text-sm text-snow/65 m-0 pt-2 border-t border-snow/8">
          <b>{player.name}</b> belum tertaut ke akun Reclub. Tautan dibuat otomatis saat pemain ini dipilih di &quot;Ambil dari Reclub&quot; (Buat Event atau sesi coaching).
        </p>
      )}
    </div>
  );
}
