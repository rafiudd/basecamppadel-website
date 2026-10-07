"use client";

import { useState, useTransition } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { Badge } from "@/components/ui/Badge";
import { compactInputClass } from "@/components/ui/Field";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { toast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { addMabarWalkIn, removeMabarParticipant, setMabarCheckIn, substituteMabarPlayer } from "@/app/admin/events/mabar-actions";
import { isFixedFormat } from "@/lib/events";
import { mabarUnits } from "@/lib/mabar";
import type { CompEvent, GenParticipant } from "@/lib/database.types";

type PlayerOption = { id: string; name: string };

/** Attendance on the day: check-in, walk-ins, and (once started) substitutes. */
export function ParticipantsPanel({
  event,
  participants,
  players,
  started,
  defaultOpen,
}: {
  event: CompEvent;
  participants: GenParticipant[];
  players: PlayerOption[];
  started: boolean;
  defaultOpen: boolean;
}) {
  const fixed = isFixedFormat(event.mabar_format);
  const locked = event.status === "finished";
  const taken = new Set(participants.filter((p) => p.active && p.player_id).map((p) => p.player_id));
  const free = players.filter((p) => !taken.has(p.id));
  const active = participants.filter((p) => p.active);
  const here = active.filter((p) => p.checked_in).length;

  return (
    <details open={defaultOpen} className="bg-ink-3 rounded-card px-4.5 py-3.5 group">
      <summary className="cursor-pointer list-none flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="font-display font-bold text-title-sm">Peserta</div>
          <div className="text-caption text-snow/70">
            {here} dari {active.length} sudah check-in{event.quota ? ` · kuota ${event.quota}` : ""} · {started ? "ganti pemain berlaku mulai ronde berikutnya" : "jadwal dibuat dari yang sudah check-in"}
          </div>
        </div>
        <span className="text-caption font-semibold text-snow/80 group-open:hidden">Tampilkan</span>
        <span className="text-caption font-semibold text-snow/80 hidden group-open:inline">Sembunyikan</span>
      </summary>

      <div className="flex flex-col mt-2">
        {mabarUnits(participants, event.mabar_format).map((u) => (
          <div key={u.key} className="py-2 border-t border-snow/8 flex flex-col gap-1">
            {fixed && <div className="text-2xs font-bold tracking-tag text-snow/60 uppercase">{u.name}</div>}
            {u.members.map((p) => (
              <ParticipantRow key={p.id} event={event} p={p} started={started} locked={locked} free={free} removable={!started && (!fixed || p === u.members[0])} />
            ))}
          </div>
        ))}
      </div>

      {!locked && <WalkInForm event={event} free={free} fixed={fixed} />}
    </details>
  );
}

function ParticipantRow({
  event,
  p,
  started,
  locked,
  free,
  removable,
}: {
  event: CompEvent;
  p: GenParticipant;
  started: boolean;
  locked: boolean;
  free: PlayerOption[];
  removable: boolean;
}) {
  const [pending, start] = useTransition();
  const [swapping, setSwapping] = useState(false);
  const toggle = (checked: boolean) =>
    start(async () => {
      toast.result(await setMabarCheckIn(event.id, p.id, checked), checked ? `${p.display_name} check-in` : `Check-in ${p.display_name} dibatalkan`);
    });

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3 min-h-10">
        <label className={`flex items-center gap-2.5 flex-1 min-w-0 ${p.active ? "cursor-pointer" : ""}`}>
          <input
            type="checkbox"
            checked={p.checked_in}
            disabled={!p.active || locked || pending}
            onChange={(e) => toggle(e.target.checked)}
            aria-label={`Check-in ${p.display_name}`}
            className="w-4.5 h-4.5 accent-volt flex-none"
          />
          <span className={`text-sm font-semibold truncate ${p.active ? "" : "text-snow/50 line-through"}`}>{p.display_name}</span>
          {pending && <Spinner className="text-volt text-xs" />}
          {!p.player_id && <Badge tone="faint">Tamu</Badge>}
          {!p.active && <Badge tone="faint">Diganti</Badge>}
        </label>
        {p.active && !locked && started && (
          <button type="button" onClick={() => setSwapping((v) => !v)} className="btn bg-transparent text-snow/85 min-h-9 px-2.5 py-1.5 text-caption">
            {swapping ? "Batal" : "Ganti"}
          </button>
        )}
        {removable && !locked && (
          <ActionForm action={removeMabarParticipant} danger successText="Peserta dihapus" confirmText={`Hapus ${p.display_name} dari event?`}>
            <input type="hidden" name="event_id" value={event.id} />
            <input type="hidden" name="participant_id" value={p.id} />
            <button type="submit" className="btn bg-transparent text-snow/70 min-h-9 px-2.5 py-1.5 text-caption hover:text-loss">Hapus</button>
          </ActionForm>
        )}
      </div>
      {swapping && (
        <ActionForm action={substituteMabarPlayer} successText="Pemain diganti" className="flex items-center gap-2 flex-wrap pl-7 pb-1">
          <input type="hidden" name="event_id" value={event.id} />
          <input type="hidden" name="participant_id" value={p.id} />
          <span className="text-caption text-snow/70">Diganti oleh</span>
          <PersonPicker name="p1" free={free} />
          <button type="submit" className="btn btn-volt min-h-10 text-caption">Simpan</button>
        </ActionForm>
      )}
    </div>
  );
}

function WalkInForm({ event, free, fixed }: { event: CompEvent; free: PlayerOption[]; fixed: boolean }) {
  return (
    <ActionForm action={addMabarWalkIn} successText="Walk-in ditambahkan" className="flex items-center gap-2 flex-wrap pt-3 mt-1 border-t border-snow/8">
      <input type="hidden" name="event_id" value={event.id} />
      <span className="text-caption font-bold">+ Walk-in</span>
      <PersonPicker name="p1" free={free} />
      {fixed && <PersonPicker name="p2" free={free} />}
      <button type="submit" className="btn min-h-10 text-caption">Tambah</button>
    </ActionForm>
  );
}

/** A registered player, or a guest typed by name (`<name>_guest`). */
function PersonPicker({ name, free }: { name: string; free: PlayerOption[] }) {
  const [guest, setGuest] = useState(false);
  return (
    <span className="flex items-center gap-1.5">
      {guest ? (
        <input name={`${name}_guest`} required placeholder="Nama tamu" className={`${compactInputClass} px-2.5 w-40`} />
      ) : (
        <span className="w-48">
          <SearchSelect
            name={name}
            required
            aria-label="Pemain"
            placeholder="Cari pemain"
            options={free.map((p) => ({ value: p.id, label: p.name }))}
            className={`${compactInputClass} px-2.5`}
          />
        </span>
      )}
      <button type="button" onClick={() => setGuest((g) => !g)} className="border-none bg-transparent p-0 text-xs font-semibold text-snow/70 underline">
        {guest ? "pemain" : "tamu"}
      </button>
    </span>
  );
}
