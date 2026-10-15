import { ActionForm } from "@/components/admin/ActionForm";
import type { Player } from "@/lib/database.types";
import { upsertPlayer } from "@/app/admin/actions";
import { LEVELS } from "@/lib/config";
import { formatWhatsapp } from "@/lib/accountRules";
import { PlayerPhotoInput } from "./PlayerPhotoInput";

/** `accountEmail`: the player account linked to this player, if any. */
export function PlayerForm({ player, accountEmail }: { player?: Player; accountEmail?: string | null }) {
  return (
    <ActionForm action={upsertPlayer} successText="Pemain tersimpan" className="bg-ink-2 rounded-2xl p-5 md:p-6 grid grid-cols-1 md:grid-photo-form gap-6">
      {player && <input type="hidden" name="id" value={player.id} />}

      <div className="flex flex-col gap-3">
        <PlayerPhotoInput current={player?.photo_url ?? null} />
        {player?.photo_url && (
          <label className="flex items-center gap-2 text-xs text-snow/70">
            <input type="checkbox" name="remove_photo" /> Hapus foto
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="label">Nama</div>
          <input className="field" name="name" required defaultValue={player?.name} />
        </div>
        <div>
          <div className="label">Gender</div>
          <select className="field" name="gender" defaultValue={player?.gender ?? "M"}>
            <option value="M">Men</option>
            <option value="F">Women</option>
          </select>
        </div>
        <div>
          <div className="label">Level</div>
          <select className="field" name="level" defaultValue={player?.level ?? "Beginner"}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="label">Region</div>
          <input className="field" name="region" defaultValue={player?.region} placeholder="Purwokerto" />
        </div>
        <div>
          <div className="label">No. WhatsApp</div>
          <input
            className="field"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            defaultValue={player?.whatsapp ? formatWhatsapp(player.whatsapp) : ""}
            placeholder="08xx-xxxx-xxxx"
          />
          <div className="text-2xs text-snow/40 mt-1">
            {accountEmail ? (
              <>Tersambung ke akun <b className="text-snow">{accountEmail}</b>.</>
            ) : (
              "Pemain yang daftar akun dengan nomor ini otomatis tersambung ke data ini."
            )}
          </div>
        </div>
        <div>
          <div className="label">Koreksi poin (manual)</div>
          <input className="field" name="points_adjustment" type="number" defaultValue={player?.points_adjustment ?? 0} />
          <div className="text-2xs text-snow/40 mt-1">
            Poin = total dari riwayat match + koreksi ini. {player && <>Saat ini: <b className="text-snow">{player.points}</b> poin, {player.wins}–{player.losses}.</>}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm self-end pb-2">
          <input type="checkbox" name="active" defaultChecked={player?.active ?? true} /> Aktif (tampil di leaderboard)
        </label>
        <div className="md:col-span-2 flex justify-end">
          <button className="btn btn-coral" type="submit">{player ? "Simpan" : "Tambah Pemain"}</button>
        </div>
      </div>
    </ActionForm>
  );
}
