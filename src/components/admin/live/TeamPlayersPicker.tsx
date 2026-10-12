"use client";

import { useState } from "react";
import { SearchSelect, type SearchOption } from "@/components/ui/SearchSelect";
import { Field } from "@/components/ui/Field";
import type { PlayerSummary } from "@/components/admin/event/types";

/**
 * Pick 1-2 registered players for one side of a freeform match (padel is usually doubles). Each slot
 * posts the chosen player id under `name` (read back with `fd.getAll(name)`); an unregistered guest
 * can be named instead via the manual-name field the caller renders alongside this.
 */
export function TeamPlayersPicker({ label, name, players, defaultIds = [] }: { label: string; name: string; players: PlayerSummary[]; defaultIds?: string[] }) {
  const [slot1, setSlot1] = useState(defaultIds[0] ?? "");
  const [slot2, setSlot2] = useState(defaultIds[1] ?? "");

  const options = (exclude: string): SearchOption[] =>
    players.map((p) => ({
      value: p.id,
      label: p.name,
      hint: [p.level, p.region].filter(Boolean).join(" · "),
      disabled: p.id !== exclude && (p.id === slot1 || p.id === slot2),
    }));

  return (
    <Field label={label}>
      <div className="flex flex-col gap-1.5">
        <SearchSelect name={name} value={slot1} onChange={setSlot1} placeholder="Cari pemain 1" options={options(slot1)} className="field" />
        <SearchSelect name={name} value={slot2} onChange={setSlot2} placeholder="Cari pemain 2 (opsional)" options={options(slot2)} className="field" />
      </div>
    </Field>
  );
}
