"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { WalkoverSelect } from "@/components/admin/event/kompetisi/ScoreModal";
import { setCompResult } from "@/app/admin/events/match-actions";
import { finishMabarMatch } from "@/app/admin/events/mabar-actions";
import type { Match, Serve } from "@/lib/database.types";

/**
 * "Selesaikan match": final games, prefilled from the live score. Kompetisi needs a winner (or a
 * walkover) and the winner advances; a mabar court may end level and its games go to the table.
 */
export function FinishMatchModal({ m, onClose, onDone }: { m: Match; onClose: () => void; onDone: () => void }) {
  const isMabar = !!m.gen_match_id;
  const [games, setGames] = useState({ A: String(m.team_a_games), B: String(m.team_b_games) });
  const [wo, setWo] = useState<"" | Serve>("");
  const [pending, start] = useTransition();
  const a = Number(games.A) || 0;
  const b = Number(games.B) || 0;
  const tie = !isMabar && !wo && a === b;

  const submit = () =>
    start(async () => {
      const res = isMabar ? await finishMabarMatch(m.id, a, b) : await setCompResult(m.id, a, b, wo || null);
      if (toast.result(res, "Hasil match tersimpan")) onDone();
    });

  return (
    <Modal title="Selesaikan match" onClose={onClose}>
      <p className="text-caption text-snow/70 m-0">
        {isMabar ? "Skor akhir dalam game. Seri boleh; game masuk ke klasemen mabar." : "Skor akhir dalam game. Pemenang otomatis maju ke babak berikutnya."}
      </p>
      <div className="flex items-end gap-3">
        {(["A", "B"] as const).map((side) => (
          <label key={side} className="flex-1 flex flex-col gap-1.5 min-w-0">
            <span className="text-caption font-semibold truncate">{side === "A" ? m.team_a_name : m.team_b_name}</span>
            <input
              inputMode="numeric"
              value={games[side]}
              onChange={(e) => setGames((g) => ({ ...g, [side]: e.target.value.replace(/\D/g, "") }))}
              className="field text-center font-display font-bold text-2xl"
            />
          </label>
        ))}
      </div>
      {!isMabar && <WalkoverSelect m={m} value={wo} onChange={setWo} />}
      {tie && <div className="text-caption text-coral-soft">Skor seri tidak bisa diselesaikan.</div>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn">Batal</button>
        <button type="button" disabled={pending || tie} data-loading={pending || undefined} onClick={submit} className="btn btn-volt">Simpan hasil</button>
      </div>
    </Modal>
  );
}
