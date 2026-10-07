"use client";

import { useState } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { CloseIcon } from "@/components/ui/icons";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { addTeam, removeTeam, saveGroups, shuffleGroups } from "@/app/admin/events/actions";
import { generateGroupSchedule } from "@/app/admin/events/match-actions";
import { FINAL_STAGE_LABEL, groupLabel } from "@/lib/competition";
import type { CompetitionData, TeamWithPlayers } from "@/lib/compData";
import type { PlayerSummary } from "@/components/admin/event/types";

/** Teams per group. Editable (add / remove / shuffle) until the group schedule exists. */
export function RosterCard({ data, players }: { data: CompetitionData; players: PlayerSummary[] }) {
  const { event, teams, matches } = data;
  const editable = matches.length === 0;
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState(false);
  const labels = [...new Set(teams.map((t) => t.group_label).filter((l): l is string => !!l))].sort();
  const ungrouped = teams.filter((t) => !t.group_label);
  const sections = [
    ...labels.map((l) => ({ label: `Grup ${l}`, teams: teams.filter((t) => t.group_label === l) })),
    ...(ungrouped.length ? [{ label: "Belum ada grup", teams: ungrouped }] : []),
  ];

  return (
    <div className="bg-ink-3 rounded-card px-5 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="font-display font-bold text-lg">
            Tim &amp; grup <span className="font-sans font-medium text-sm text-snow/65">{teams.length} dari {event.num_teams} tim</span>
          </div>
          <div className="text-caption text-snow/70">{editable ? "Atur pasangan dan grup, lalu buat jadwal fase grup." : "Jadwal sudah dibuat, tim dan grup terkunci."}</div>
        </div>
        {editable && (
          <div className="flex items-center gap-2">
            <ActionForm action={shuffleGroups} successText="Grup diacak">
              <input type="hidden" name="event_id" value={event.id} />
              <button type="submit" className="btn min-h-10 px-3.5 py-2 text-caption">Shuffle grup</button>
            </ActionForm>
            {teams.length > 0 && !moving && (
              <button type="button" onClick={() => setMoving(true)} className="btn min-h-10 px-3.5 py-2 text-caption">
                Atur grup
              </button>
            )}
            {teams.length < event.num_teams && (
              <button type="button" onClick={() => setAdding((v) => !v)} className="btn min-h-10 px-3.5 py-2 text-caption">
                {adding ? "Batal" : "+ Tambah tim"}
              </button>
            )}
          </div>
        )}
      </div>

      {editable && adding && <AddTeamForm eventId={event.id} players={players} teams={teams} />}

      {editable && moving ? (
        <MoveGroupsForm eventId={event.id} teams={teams} groups={event.num_groups} onDone={() => setMoving(false)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {sections.map((s) => (
            <div key={s.label} className="bg-ink-2 rounded-xl p-3">
              <div className="text-xs font-bold tracking-caps text-snow/70 uppercase mb-1.5">{s.label}</div>
              {[...s.teams].sort(byName).map((t) => <TeamLine key={t.id} team={t} eventId={event.id} editable={editable} />)}
            </div>
          ))}
          {teams.length === 0 && <p className="text-sm text-snow/55 m-0">Belum ada tim. Tambah pasangan tim dulu.</p>}
        </div>
      )}

      {editable && !moving && teams.length >= 3 && (
        <ActionForm action={generateGroupSchedule} successText="Jadwal fase grup dibuat" confirmLabel="Ya, buat jadwal" confirmText="Buat jadwal fase grup sekarang? Tim dijadwalkan otomatis ke court dan jam yang tersedia." className="flex justify-end pt-1">
          <input type="hidden" name="event_id" value={event.id} />
          <button type="submit" className="btn btn-coral text-ink">Buat jadwal fase grup</button>
        </ActionForm>
      )}
    </div>
  );
}

function TeamLine({ team, eventId, editable }: { team: TeamWithPlayers; eventId: string; editable: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-t border-snow/8 first-of-type:border-t-0">
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate">{team.name}</div>
        {team.final_stage && <div className="text-2xs text-snow/60">{FINAL_STAGE_LABEL[team.final_stage]}</div>}
      </div>
      {editable && (
        <ActionForm action={removeTeam} danger successText="Tim dihapus" confirmText={`Hapus tim "${team.name}"?`}>
          <input type="hidden" name="event_id" value={eventId} />
          <input type="hidden" name="team_id" value={team.id} />
          <button type="submit" aria-label={`Hapus ${team.name}`} className="w-9 h-9 bg-transparent border-none text-snow/55 hover:text-loss p-0 flex items-center justify-center">
            <CloseIcon size={16} />
          </button>
        </ActionForm>
      )}
    </div>
  );
}

function AddTeamForm({ eventId, players, teams }: { eventId: string; players: PlayerSummary[]; teams: TeamWithPlayers[] }) {
  const [p1, setP1] = useState("");
  const used = new Set(teams.flatMap((t) => t.players.map((p) => p.id)));
  return (
    <ActionForm action={addTeam} successText="Tim ditambahkan" className="flex flex-col md:flex-row md:items-end gap-2.5 bg-ink-2 rounded-xl p-3">
      <input type="hidden" name="event_id" value={eventId} />
      {(["p1", "p2"] as const).map((k, i) => (
        <label key={k} className="flex-1 flex flex-col">
          <span className="label">Pemain {i + 1}</span>
          <SearchSelect
            name={k}
            required
            aria-label={`Pemain ${i + 1}`}
            placeholder="Cari pemain"
            onChange={k === "p1" ? setP1 : undefined}
            options={players.map((p) => ({
              value: p.id,
              label: p.name,
              hint: [p.level, p.region].filter(Boolean).join(" · "),
              disabled: used.has(p.id) || (k === "p2" && p.id === p1),
            }))}
            className="field text-sm"
          />
        </label>
      ))}
      <button type="submit" className="btn btn-coral text-ink whitespace-nowrap">Simpan tim</button>
    </ActionForm>
  );
}

const byName = (a: TeamWithPlayers, b: TeamWithPlayers) => a.name.localeCompare(b.name);

/**
 * "Atur grup": a board with one column per group, teams sorted by name. Move a team by dragging it
 * to another column or with the group buttons on its row; nothing is saved until "Simpan grup".
 */
function MoveGroupsForm({ eventId, teams, groups, onDone }: { eventId: string; teams: TeamWithPlayers[]; groups: number; onDone: () => void }) {
  const labels = Array.from({ length: groups }, (_, g) => groupLabel(g));
  const initial = Object.fromEntries(teams.map((t) => [t.id, t.group_label ?? ""]));
  const [assign, setAssign] = useState<Record<string, string>>(initial);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const move = (teamId: string, label: string) => setAssign((a) => ({ ...a, [teamId]: label }));
  const columns = [
    ...labels.map((l) => ({ key: l, title: `Grup ${l}` })),
    ...(teams.some((t) => !assign[t.id]) ? [{ key: "", title: "Belum ada grup" }] : []),
  ];
  const members = (key: string) => teams.filter((t) => assign[t.id] === key).sort(byName);
  const counts = labels.map((l) => members(l).length);
  // the schedule only uses groups that have teams, so an empty group doesn't count as unbalanced
  const used = counts.filter((n) => n > 0);
  const unbalanced = used.length > 0 && Math.max(...used) - Math.min(...used) > 1;
  const unassigned = teams.filter((t) => !assign[t.id]).length;
  const changed = teams.some((t) => assign[t.id] !== initial[t.id]);
  const drop = (key: string) => {
    if (dragging) move(dragging, key);
    setDragging(null);
    setOver(null);
  };

  return (
    <ActionForm
      action={async (state, fd) => {
        const res = await saveGroups(state, fd);
        if (!res?.error) onDone();
        return res;
      }}
      successText="Grup tersimpan"
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="event_id" value={eventId} />
      {teams.map((t) => <input key={t.id} type="hidden" name={`group_${t.id}`} value={assign[t.id]} />)}

      <div className="text-caption text-snow/70">Seret tim ke grup lain, atau pilih grup tujuan di baris tim.</div>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 200px), 1fr))` }}>
        {columns.map((col) => {
          const list = members(col.key);
          return (
            <div
              key={col.key || "none"}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(col.key);
              }}
              onDragLeave={() => setOver((o) => (o === col.key ? null : o))}
              onDrop={() => drop(col.key)}
              className={`bg-ink-2 rounded-xl p-3 flex flex-col gap-1.5 min-w-0 transition-shadow ${over === col.key ? "ring-2 ring-inset ring-volt" : ""}`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <div className={`font-display font-bold text-input ${col.key ? "text-volt" : "text-snow/70"}`}>{col.title}</div>
                <span className="text-xs text-snow/60">{list.length} tim</span>
              </div>
              {list.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={() => setDragging(t.id)}
                  onDragEnd={() => {
                    setDragging(null);
                    setOver(null);
                  }}
                  className={`flex items-center gap-2 rounded-lg bg-ink-3 pl-2.5 pr-1.5 py-1.5 cursor-grab active:cursor-grabbing ${dragging === t.id ? "opacity-40" : ""} ${
                    assign[t.id] !== initial[t.id] ? "shadow-mark-volt" : ""
                  }`}
                >
                  <span className="flex-1 min-w-0 text-sm font-semibold leading-snug break-words" title={t.name}>{t.name}</span>
                  <select
                    value={assign[t.id]}
                    onChange={(e) => move(t.id, e.target.value)}
                    aria-label={`Grup untuk ${t.name}`}
                    className="select-chip flex-none rounded-md border-none bg-snow/10 text-snow text-xs font-bold outline-none focus:ring-2 focus:ring-inset focus:ring-volt"
                  >
                    {!assign[t.id] && <option value="">–</option>}
                    {labels.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              ))}
              {!list.length && (
                <div className="text-caption text-snow/45 py-2 px-2 text-center border border-dashed border-snow/15 rounded-lg">
                  Seret tim ke sini{col.key ? <span className="block text-2xs text-snow/35 mt-0.5">Grup kosong tidak dipakai di jadwal</span> : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(unbalanced || unassigned > 0) && (
        <div className="text-caption text-coral-soft font-semibold">
          {unbalanced && `Jumlah tim antar grup belum rata (selisih maksimal 1): ${labels.filter((_, i) => counts[i]).map((l) => `${l} ${counts[labels.indexOf(l)]}`).join(" · ")}. `}
          {unassigned > 0 && `${unassigned} tim belum masuk grup. `}
          Jadwal fase grup baru bisa dibuat setelah ini beres.
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" disabled={!changed} onClick={() => setAssign(initial)} className="btn bg-transparent text-snow/85 min-h-10">Reset</button>
        <button type="button" onClick={onDone} className="btn min-h-10">Batal</button>
        <button type="submit" disabled={!changed} className="btn btn-volt min-h-10">Simpan grup</button>
      </div>
    </ActionForm>
  );
}
