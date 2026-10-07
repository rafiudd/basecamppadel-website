"use client";

import { ActionForm } from "@/components/admin/ActionForm";
import { Modal } from "@/components/ui/Modal";
import { correctScore } from "@/app/admin/events/match-actions";
import type { Match } from "@/lib/database.types";

/** Enter or correct a match result (games per team, or a walkover). */
export function ScoreModal({ m, onClose }: { m: Match; onClose: () => void }) {
  return (
    <Modal title={m.status === "finished" ? "Edit skor" : "Isi skor"} onClose={onClose}>
      <p className="text-caption text-snow/70 m-0">Pemenang ditentukan dari jumlah game. Skor tidak boleh seri.</p>
      <ActionForm
        action={async (state, fd) => {
          const res = await correctScore(state, fd);
          if (!res?.error) onClose();
          return res;
        }}
        successText="Skor tersimpan"
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="match_id" value={m.id} />
        <div className="flex items-end gap-3">
          {(["a", "b"] as const).map((s) => (
            <label key={s} className="flex-1 flex flex-col gap-1.5 min-w-0">
              <span className="text-caption font-semibold truncate">{s === "a" ? m.team_a_name : m.team_b_name}</span>
              <input type="number" min={0} name={`games_${s}`} defaultValue={s === "a" ? m.team_a_games : m.team_b_games} className="field text-center font-display font-bold text-2xl no-spinner" />
            </label>
          ))}
        </div>
        <WalkoverSelect name="wo" m={m} defaultValue={m.is_wo ? (m.winner ?? "") : ""} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn">Batal</button>
          <button type="submit" className="btn btn-coral text-ink">Simpan skor</button>
        </div>
      </ActionForm>
    </Modal>
  );
}

/** "Bukan WO" / "<tim A> menang WO" / "<tim B> menang WO". Uncontrolled with `name`, or controlled. */
export function WalkoverSelect({
  m,
  name,
  defaultValue,
  value,
  onChange,
}: {
  m: Pick<Match, "team_a_name" | "team_b_name">;
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (v: "" | "A" | "B") => void;
}) {
  return (
    <label className="flex flex-col">
      <span className="label">Walkover (WO)</span>
      <select
        name={name}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value as "" | "A" | "B") : undefined}
        className="field text-sm"
      >
        <option value="">Bukan WO</option>
        <option value="A">{m.team_a_name} menang WO</option>
        <option value="B">{m.team_b_name} menang WO</option>
      </select>
    </label>
  );
}
