"use client";

import { useState } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { courtLabel } from "@/lib/format";
import { startFreeformMatch } from "@/app/admin/live/freeform-actions";
import { TeamPlayersPicker } from "@/components/admin/live/TeamPlayersPicker";
import type { Court, Venue } from "@/lib/database.types";
import type { PlayerSummary } from "@/components/admin/event/types";

/** "+ Live tanpa event": starts a bare ON AIR match (no event) on a chosen court. */
export function StartFreeformButton({ courts, venues, players }: { courts: Court[]; venues: Venue[]; players: PlayerSummary[] }) {
  const [open, setOpen] = useState(false);
  const venueName = (id: string | null) => venues.find((v) => v.id === id)?.name ?? "";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-volt text-sm">+ Live tanpa event</button>
      {open && (
        <Modal title="Mulai live tanpa event" onClose={() => setOpen(false)}>
          <p className="text-caption text-snow/70 m-0">
            Buat match ON AIR langsung di satu court, nggak nempel ke event manapun — cocok buat siaran kamera court atau match santai. Skornya nggak masuk leaderboard.
          </p>
          <ActionForm action={startFreeformMatch} successText="Live dimulai" className="flex flex-col gap-3">
            <Field label="Court">
              <select name="court_id" required className="field">
                <option value="">— pilih court —</option>
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {[venueName(c.venue_id), courtLabel(c.name)].filter(Boolean).join(" · ")}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TeamPlayersPicker label="Tim A" name="team_a_player_ids" players={players} />
              <TeamPlayersPicker label="Tim B" name="team_b_player_ids" players={players} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Atau nama manual tim A (kalau belum pemain terdaftar)">
                <input name="team_a_name" className="field" placeholder="Tim A" />
              </Field>
              <Field label="Atau nama manual tim B (kalau belum pemain terdaftar)">
                <input name="team_b_name" className="field" placeholder="Tim B" />
              </Field>
            </div>
            <Field label="Link YouTube (opsional)">
              <input name="stream_url" className="field" placeholder="https://youtube.com/watch?v=..." />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="btn">Batal</button>
              <button type="submit" className="btn btn-coral text-ink">Mulai live</button>
            </div>
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
