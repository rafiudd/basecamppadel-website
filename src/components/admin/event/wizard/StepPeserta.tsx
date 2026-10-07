"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { GenderBadge } from "@/components/ui/Badge";
import { CloseIcon, SearchIcon } from "@/components/ui/icons";
import { compactInputClass, inputClass, invalidIf } from "@/components/ui/Field";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { groupLabel } from "@/lib/competition";
import type { PlayerSummary } from "@/components/admin/event/types";
import type { EventWizard } from "./useEventWizard";
import { Panel, ShuffleButton, StepSection } from "./parts";

/** Participants: fixed pairs (kompetisi / fixed-partner mabar) or a player checklist (free mabar). */
export function StepPeserta({ w, players }: { w: EventWizard; players: PlayerSummary[] }) {
  const sub = !w.isMabar ? "Atur pasangan tim, lalu bagi ke grup" : w.fixed ? "Atur pasangan tetap untuk mabar ini" : "Pilih pemain yang ikut, pairing diacak per ronde";
  return (
    <StepSection title="Peserta" sub={sub}>
      {w.usesPairs ? (
        <div className={`grid grid-cols-1 ${w.isMabar ? "" : "lg:grid-cols-2"} gap-3.5 items-start min-w-0`}>
          <TeamPairsEditor w={w} players={players} />
          {!w.isMabar && <GroupAssignment w={w} />}
          {w.fixed && <PairingPreview w={w} count={`${w.teams.filled.length} pasangan`} />}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-list-preview gap-4 items-start">
          <PlayerChecklist w={w} players={players} />
          <PairingPreview w={w} count={`${w.mabar.picked.length} pemain`} />
        </div>
      )}
    </StepSection>
  );
}

function TeamPairsEditor({ w, players }: { w: EventWizard; players: PlayerSummary[] }) {
  const { teams } = w;
  return (
    <Panel
      invalid={w.invalid("teams")}
      title="Pasangan tim"
      sub={`Pilih pemain 1 & 2 langsung dari daftar pemain · ${teams.list.length} tim`}
      action={<button type="button" onClick={teams.autoPair} className="btn min-h-10 px-3.5 py-2 tracking-button whitespace-nowrap">Pasangkan otomatis</button>}
    >
      <div className="flex flex-col gap-1.5 max-h-90 overflow-y-auto">
        {teams.list.map((t, i) => (
          <div key={i} className="grid grid-team-row gap-1.5 items-center">
            <span className="text-xs font-bold text-snow/70"><span className="md:hidden">T</span><span className="hidden md:inline">Tim </span>{i + 1}</span>
            {(["p1", "p2"] as const).map((k, j) => (
              <SearchSelect
                key={k}
                aria-label={`Tim ${i + 1} pemain ${j + 1}`}
                aria-invalid={w.invalid(`team:${i}:${k}`)}
                value={t[k]}
                onChange={(v) => teams.setPlayer(i, k, v)}
                placeholder="Cari pemain"
                options={players.map((p) => ({
                  value: p.id,
                  label: p.name,
                  hint: [p.level, p.region].filter(Boolean).join(" · "),
                  disabled: p.id !== t[k] && teams.chosen.includes(p.id),
                }))}
                className={`${compactInputClass} font-semibold px-2 min-w-0 ${invalidIf(w.invalid(`team:${i}:${k}`))}`}
              />
            ))}
            <button type="button" aria-label={`Hapus tim ${i + 1}`} onClick={() => teams.remove(i)} className="w-9 h-9 border-none bg-transparent text-snow/70 p-0 flex items-center justify-center">
              <CloseIcon />
            </button>
          </div>
        ))}
      </div>
      {w.mabar.maxPairs !== null && teams.list.length >= w.mabar.maxPairs ? (
        <div className="text-xs text-snow/70 text-center py-2">Kuota {w.mabar.maxPlayers} pemain = maks {w.mabar.maxPairs} pasangan, sudah penuh.</div>
      ) : (
        <button type="button" onClick={teams.add} className="border border-dashed border-snow/30 rounded-lg bg-transparent text-snow min-h-11 font-bold text-sm">+ Tambah tim</button>
      )}
    </Panel>
  );
}

/**
 * Group cards. A team moves to another group by dragging it onto that card, or with the small group
 * picker on its row (touch / keyboard).
 */
function GroupAssignment({ w }: { w: EventWizard }) {
  const numGroups = w.kompetisi.groupCount;
  const labels = Array.from({ length: numGroups }, (_, g) => groupLabel(g));
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const pairName = (t: { p1: string; p2: string }) => `${w.nameOf.get(t.p1)} / ${w.nameOf.get(t.p2)}`;
  const membersOf = (label: string) =>
    w.teams.list.map((t, index) => ({ t, index })).filter(({ t }) => t.p1 && t.p2 && t.group === label);
  const drop = (label: string) => {
    if (dragging !== null) w.teams.setGroup(dragging, label);
    setDragging(null);
    setOver(null);
  };

  return (
    <Panel
      invalid={w.invalid("groups")}
      title="Pembagian grup & seed"
      sub="Acak ulang sampai pas, atau geser tim manual: seret ke grup lain, atau pilih grupnya."
      action={<ShuffleButton onClick={w.teams.shuffleGroups}>Shuffle grup</ShuffleButton>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {labels.map((label) => {
          const members = membersOf(label);
          return (
            <div
              key={label}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(label);
              }}
              onDragLeave={() => setOver((o) => (o === label ? null : o))}
              onDrop={() => drop(label)}
              className={`bg-ink-2 rounded-xl px-3.5 py-3 flex flex-col gap-1.5 min-w-0 transition-shadow ${over === label ? "ring-2 ring-inset ring-volt" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-display font-bold text-input text-volt">Grup {label}</div>
                <div className="text-xs text-snow/60">{members.length} tim</div>
              </div>
              {members.map(({ t, index }, k) => (
                <div
                  key={index}
                  draggable
                  onDragStart={() => setDragging(index)}
                  onDragEnd={() => {
                    setDragging(null);
                    setOver(null);
                  }}
                  className={`flex items-center gap-2 py-1.5 border-t border-snow/8 cursor-grab active:cursor-grabbing ${dragging === index ? "opacity-40" : ""}`}
                >
                  <span className="flex-none w-6.5 h-6 rounded-md bg-snow/10 flex items-center justify-center text-xs font-bold">{label}{k + 1}</span>
                  <span className="flex-1 text-sm font-semibold min-w-0 truncate">{pairName(t)}</span>
                  <select
                    aria-label={`Pindahkan ${pairName(t)} ke grup`}
                    value={t.group}
                    onChange={(e) => w.teams.setGroup(index, e.target.value)}
                    className="select-chip flex-none rounded-md border-none bg-snow/10 text-snow text-xs font-bold outline-none focus:ring-2 focus:ring-inset focus:ring-volt"
                  >
                    {labels.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              ))}
              {!members.length && <div className="text-caption text-snow/50 py-1.5 border-t border-snow/8">Seret tim ke sini</div>}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function PlayerChecklist({ w, players }: { w: EventWizard; players: PlayerSummary[] }) {
  const { picked, setPicked, maxPlayers } = w.mabar;
  const [search, setSearch] = useState("");
  const shown = players.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()));
  const full = maxPlayers !== null && picked.length >= maxPlayers;
  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : maxPlayers !== null && prev.length >= maxPlayers ? prev : [...prev, id]));
  /** "Pilih semua" stops at the quota. */
  const pickAll = () =>
    setPicked((prev) => {
      const add = shown.map((p) => p.id).filter((id) => !prev.includes(id));
      return [...prev, ...add.slice(0, maxPlayers === null ? undefined : Math.max(0, maxPlayers - prev.length))];
    });
  return (
    <div className={`bg-ink-3 rounded-card p-4 flex flex-col gap-2.5 min-w-0 ${invalidIf(w.invalid("players"))}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="font-display font-bold text-base">Daftar pemain</div>
        <div className={`text-caption font-bold ${maxPlayers !== null && picked.length > maxPlayers ? "text-coral-soft" : "text-volt"}`}>
          {picked.length}
          {maxPlayers !== null ? ` / ${maxPlayers}` : ""} dipilih
        </div>
      </div>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-3 text-snow/70" />
        <input aria-label="Cari pemain" placeholder="Cari pemain" value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputClass} pl-10`} />
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={pickAll} disabled={full} className="border-none bg-transparent p-0 text-caption font-semibold text-snow/85 disabled:text-snow/35">
          {maxPlayers !== null ? `Pilih sampai ${maxPlayers}` : "Pilih semua"}
        </button>
        <button type="button" onClick={() => setPicked([])} className="border-none bg-transparent p-0 text-caption font-semibold text-snow/85">Kosongkan</button>
      </div>
      {full && <div className="text-xs text-snow/70">Kuota {maxPlayers} pemain sudah penuh. Hapus centang pemain lain untuk mengganti, atau naikkan kuota di langkah Format.</div>}
      <div className="max-h-130 overflow-y-auto -mx-1">
        {shown.map((p) => {
          const on = picked.includes(p.id);
          const locked = full && !on;
          return (
          <label key={p.id} className={`flex items-center gap-3 px-1 py-2 border-t border-snow/7 min-h-11 box-border ${locked ? "opacity-45 cursor-not-allowed" : "cursor-pointer"}`}>
            <input type="checkbox" checked={on} disabled={locked} onChange={() => toggle(p.id)} className="w-4.5 h-4.5 accent-volt flex-none" />
            <Avatar name={p.name} />
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-sm">{p.name}</span>
              <span className="block text-xs text-snow/70">{[p.level, p.region].filter(Boolean).join(" · ")}</span>
            </span>
            <GenderBadge gender={p.gender} />
          </label>
          );
        })}
      </div>
    </div>
  );
}

/** Example of round 1. The real schedule is made on the event page from the players who checked in. */
function PairingPreview({ w, count }: { w: EventWizard; count: string }) {
  const { round1, reshuffle } = w.mabar;
  const pairLabel = (ids: string[]) => ids.map((id) => w.nameOf.get(id) ?? "?").join(" & ");
  return (
    <Panel
      title="Contoh pairing ronde 1"
      sub={`${count} · ${Math.max(1, w.details.courtIds.length)} court · jadwal final dibuat setelah check-in di hari H`}
      action={<ShuffleButton onClick={reshuffle}>Shuffle pemain</ShuffleButton>}
    >
      {round1.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {round1.map((c, i) => (
            <div key={i} className="bg-ink-2 rounded-xl px-3.5 py-3 flex flex-col gap-1.5">
              <div className="text-xs font-bold tracking-tag text-snow/70">{w.courtName(i).toUpperCase()}</div>
              <div className="text-sm font-bold">{pairLabel(c.a)}</div>
              <div className="text-xs text-snow/60">vs</div>
              <div className="text-sm font-bold">{pairLabel(c.b)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-caption text-snow/60">Pairing muncul setelah cukup peserta (4 pemain atau 2 pasangan per court).</div>
      )}
    </Panel>
  );
}
