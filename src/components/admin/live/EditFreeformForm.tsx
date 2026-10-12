"use client";

import { ActionForm } from "@/components/admin/ActionForm";
import { Field } from "@/components/ui/Field";
import { updateFreeformMatch, deleteFreeformMatch } from "@/app/admin/live/freeform-actions";
import { TeamPlayersPicker } from "@/components/admin/live/TeamPlayersPicker";
import type { Match } from "@/lib/database.types";
import type { PlayerSummary } from "@/components/admin/event/types";

/** Nama tim / link YouTube bisa diubah kapan saja; skor & ON AIR dikontrol lewat LiveControl di sebelahnya. */
export function EditFreeformForm({ m, players }: { m: Match; players: PlayerSummary[] }) {
  return (
    <div className="bg-ink-2 rounded-2xl p-5 flex flex-col gap-4">
      <div className="font-bold">Detail match</div>
      <ActionForm action={updateFreeformMatch} successText="Tersimpan" className="flex flex-col gap-3">
        <input type="hidden" name="match_id" value={m.id} />
        <TeamPlayersPicker label="Tim A" name="team_a_player_ids" players={players} defaultIds={m.team_a_player_ids} />
        <TeamPlayersPicker label="Tim B" name="team_b_player_ids" players={players} defaultIds={m.team_b_player_ids} />
        <Field label="Atau nama manual tim A (kalau belum pemain terdaftar)">
          <input name="team_a_name" defaultValue={m.team_a_player_ids.length ? "" : m.team_a_name} className="field" />
        </Field>
        <Field label="Atau nama manual tim B (kalau belum pemain terdaftar)">
          <input name="team_b_name" defaultValue={m.team_b_player_ids.length ? "" : m.team_b_name} className="field" />
        </Field>
        <Field label="Link YouTube">
          <input name="stream_url" defaultValue={m.stream_url ?? ""} placeholder="https://youtube.com/watch?v=..." className="field" />
        </Field>
        <button type="submit" className="btn btn-coral text-ink self-end">Simpan</button>
      </ActionForm>

      {m.status === "finished" && (
        <ActionForm
          action={deleteFreeformMatch}
          successText="Match dihapus"
          confirmText="Hapus match tanpa event ini? Nggak bisa dibatalkan."
          confirmLabel="Ya, hapus"
          danger
          className="pt-2 border-t border-snow/8"
        >
          <input type="hidden" name="match_id" value={m.id} />
          <button type="submit" className="btn btn-danger w-full">Hapus match</button>
        </ActionForm>
      )}
    </div>
  );
}
