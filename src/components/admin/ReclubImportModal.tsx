"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { SearchSelect, type SearchOption } from "@/components/ui/SearchSelect";
import { Spinner } from "@/components/ui/Spinner";
import { compactInputClass, inputClass, invalidIf } from "@/components/ui/Field";
import { unwrap } from "@/lib/actionState";
import { RECLUB_STATUS_LABEL, reclubTeam, type ReclubClubMeet, type ReclubMeet, type ReclubStatus } from "@/lib/reclub";
import { formatRupiah } from "@/lib/format";
import type { Player } from "@/lib/database.types";
import {
  confirmReclubImportAction,
  listReclubMeetsAction,
  previewReclubMeetAction,
  type ReclubImportChoice,
  type ReclubImportRow,
} from "@/app/admin/reclub/actions";

export type ReclubMeetInfo = Omit<ReclubMeet, "participants">;
export type ReclubImportResult = {
  meet: ReclubMeetInfo;
  /** The imported players in Reclub's order, with their fixed-partner team (if any). */
  players: { playerId: string; team: string | null }[];
  /** Players created by this import (not in the caller's list yet). */
  newPlayers: Player[];
};

const NEW = "__new";
/** Statuses offered for import, in this order; invited and left participants never signed up. */
const SHOWN: ReclubStatus[] = ["confirmed", "waitlisted", "requested", "maybe"];
const HOW_LABEL = { linked: "Tertaut", name: "Nama sama — cek", none: "" } as const;

/** A block of the review list: one Reclub team, the confirmed players without a team, or one other status. */
type Section = { key: string; title: string; sub?: string; color?: string; team?: string; rows: ReclubImportRow[] };

function toSections(rows: ReclubImportRow[]): Section[] {
  const teams = new Map<string, ReclubImportRow[]>();
  const noTeam: ReclubImportRow[] = [];
  const other = new Map<ReclubStatus, ReclubImportRow[]>();
  for (const r of rows) {
    if (r.status === "confirmed" && r.team) teams.set(r.team, [...(teams.get(r.team) ?? []), r]);
    else if (r.status === "confirmed") noTeam.push(r);
    else other.set(r.status, [...(other.get(r.status) ?? []), r]);
  }
  const out: Section[] = [...teams].map(([team, rs]) => {
    const { label, color } = reclubTeam(team);
    const sub = rs.length >= 2 ? "2 pemain (lengkap)" : "1 pemain (partner belum ada)";
    return { key: team, title: `Tim ${label}`, sub, color, team, rows: rs };
  });
  if (noTeam.length) {
    out.push({
      key: "confirmed",
      title: teams.size ? "Peserta tanpa tim" : "Peserta terkonfirmasi",
      sub: `${noTeam.length} pemain`,
      rows: noTeam,
    });
  }
  for (const s of SHOWN.slice(1)) {
    const rs = other.get(s);
    if (rs?.length) out.push({ key: s, title: RECLUB_STATUS_LABEL[s], sub: `${rs.length} pemain`, rows: rs });
  }
  return out;
}

/**
 * "Ambil dari Reclub": pick one of Basecamp's upcoming Reclub meets (or paste any meet link), check
 * who matches which player, then import. The list is grouped like Reclub's: one block per team,
 * then confirmed players without a team, then waitlist and the rest. Confirmed participants are
 * ticked by default. New players are created (with their Reclub photo) and every chosen player is
 * linked to its Reclub account for next time. `teamNote` says what the caller does with the teams.
 */
export function ReclubImportModal({
  players,
  teamNote,
  onImport,
  onClose,
}: {
  players: Pick<Player, "id" | "name" | "level" | "region">[];
  teamNote?: string;
  onImport: (result: ReclubImportResult) => void;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    });
  };

  // ---- step 1: choose a meet
  const [clubMeets, setClubMeets] = useState<ReclubClubMeet[] | null>(null);
  const [clubError, setClubError] = useState<string | null>(null);
  const [link, setLink] = useState("");
  useEffect(() => {
    listReclubMeetsAction().then((res) => ("meets" in res ? setClubMeets(res.meets) : setClubError(res.error)));
  }, []);

  // ---- step 2: review participants
  const [preview, setPreview] = useState<{ meet: ReclubMeetInfo; rows: ReclubImportRow[] } | null>(null);
  const [included, setIncluded] = useState<Set<number>>(new Set());
  const [choice, setChoice] = useState<Record<number, string>>({});
  const [gender, setGender] = useState<Record<number, "M" | "F" | "">>({});
  const [showErrors, setShowErrors] = useState(false);

  const load = (input: string) =>
    run(`load:${input}`, async () => {
      const res = unwrap(await previewReclubMeetAction(input));
      const rows = res.rows.filter((r) => SHOWN.includes(r.status));
      setPreview({ meet: res.meet, rows });
      setIncluded(new Set(rows.filter((r) => r.status === "confirmed").map((r) => r.reclubUserId)));
      setChoice(Object.fromEntries(rows.map((r) => [r.reclubUserId, r.playerId ?? NEW])));
      setGender(Object.fromEntries(rows.map((r) => [r.reclubUserId, r.gender ?? ""])));
      setShowErrors(false);
    });

  const sections = useMemo(() => toSections(preview?.rows ?? []), [preview]);
  // in display order, so the result keeps Reclub's team order
  const ordered = sections.flatMap((s) => s.rows);
  const chosenRows = ordered.filter((r) => included.has(r.reclubUserId));
  const pickedIds = chosenRows.map((r) => choice[r.reclubUserId]).filter((v) => v && v !== NEW);
  const dupes = new Set(pickedIds.filter((id, i) => pickedIds.indexOf(id) !== i));
  const missingGender = chosenRows.filter((r) => choice[r.reclubUserId] === NEW && !gender[r.reclubUserId]);
  const newCount = chosenRows.filter((r) => choice[r.reclubUserId] === NEW).length;
  const toggleMany = (ids: number[], on: boolean) =>
    setIncluded((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const submit = () => {
    if (!preview) return;
    if (!chosenRows.length || dupes.size || missingGender.length) return setShowErrors(true);
    run("import", async () => {
      const choices: ReclubImportChoice[] = chosenRows.map((r) =>
        choice[r.reclubUserId] === NEW
          ? { reclubUserId: r.reclubUserId, create: { name: r.name, gender: gender[r.reclubUserId] as "M" | "F" } }
          : { reclubUserId: r.reclubUserId, playerId: choice[r.reclubUserId] },
      );
      const res = unwrap(await confirmReclubImportAction(choices));
      onImport({
        meet: preview.meet,
        players: chosenRows.map((r) => ({ playerId: res.playerIds[r.reclubUserId], team: r.team })),
        newPlayers: res.newPlayers,
      });
      onClose();
    });
  };

  const optionsFor = (r: ReclubImportRow): SearchOption[] => [
    { value: NEW, label: "+ Pemain baru", hint: r.name },
    ...players.map((p) => ({
      value: p.id,
      label: p.name,
      hint: [p.level, p.region].filter(Boolean).join(" · "),
      disabled: p.id !== choice[r.reclubUserId] && pickedIds.includes(p.id),
    })),
  ];

  return (
    <Modal title="Ambil peserta dari Reclub" onClose={onClose} width={760} closeOnBackdropClick={false}>
      {!preview ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="text-sm font-bold">Meet Basecamp Padel yang akan datang</div>
            {clubMeets === null && !clubError && <div className="text-caption text-snow/60 flex items-center gap-2"><Spinner label={null} /> Memuat dari Reclub…</div>}
            {clubError && <div className="text-caption text-coral-soft">{clubError}</div>}
            {clubMeets?.length === 0 && <div className="text-caption text-snow/60">Tidak ada meet mendatang di klub Reclub Basecamp.</div>}
            <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto">
              {clubMeets?.map((m) => (
                <button
                  key={m.code}
                  type="button"
                  disabled={pending}
                  data-loading={busy === `load:${m.code}` || undefined}
                  onClick={() => load(m.code)}
                  className="text-left border-none rounded-xl bg-snow/6 hover:bg-snow/10 text-snow px-3.5 py-2.5 flex items-center gap-3 disabled:opacity-60"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-sm truncate">{m.name}</span>
                    <span className="block text-xs text-snow/65">{m.date} · {m.time}{m.hasTeams !== undefined ? ` · ${m.hasTeams ? "Format Tim" : "Format Perorangan"}` : ""}</span>
                  </span>
                  <span className="text-xs font-bold text-volt whitespace-nowrap">{m.confirmed}{m.quota ? ` / ${m.quota}` : ""} confirmed</span>
                </button>
              ))}
            </div>
          </div>
          {/* not a <form>: the coaching session form renders this modal inside its own form */}
          <div className="flex flex-col gap-2">
            <div className="text-sm font-bold">Atau tempel link meet</div>
            <div className="flex gap-2">
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (link.trim() && !pending) load(link.trim());
                }}
                placeholder="https://reclub.co/m/D0DBRA"
                aria-label="Link meet Reclub"
                className={inputClass}
              />
              <button type="button" onClick={() => load(link.trim())} disabled={pending || !link.trim()} data-loading={busy === `load:${link.trim()}` || undefined} className="btn btn-volt min-h-11 whitespace-nowrap">Ambil</button>
            </div>
            <div className="text-xs text-snow/55">Untuk meet yang sudah lewat atau dari klub lain.</div>
          </div>
          {error && <div role="alert" className="text-sm text-coral-soft">{error}</div>}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-snow/6 px-4 py-3 flex flex-col gap-1">
            <div className="font-bold">{preview.meet.name}</div>
            <div className="text-xs text-snow/70">
              {[`${preview.meet.date} · ${preview.meet.time}`, `${preview.meet.durationHours} jam`, preview.meet.venueName, preview.meet.feeAmount ? formatRupiah(preview.meet.feeAmount) : null, preview.meet.quota ? `kuota ${preview.meet.quota}` : null, preview.meet.hasTeams ? "Format Tim" : "Format Perorangan"]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>

          <div className="text-xs text-snow/65">
            Centang siapa yang diambil, lalu cocokkan ke pemain yang sudah ada. Yang tidak ketemu dibuat sebagai pemain baru (dengan foto Reclub-nya) dan tertaut ke akun Reclub.
          </div>
          {sections.some((s) => s.team) ? (
            <div className="text-xs text-volt font-semibold">
              {teamNote || "Peserta yang sudah berpasangan di Reclub otomatis dimasukkan ke satu tim. Tim yang baru 1 orang akan disiapkan slot timnya sendiri."}
            </div>
          ) : (
            <div className="text-xs text-snow/60">
              Event ini tidak menggunakan format tim di Reclub (peserta perorangan).
            </div>
          )}

          {!sections.length && <div className="text-caption text-snow/60">Meet ini belum punya peserta.</div>}
          <div className="flex flex-col gap-2 max-h-110 overflow-y-auto">
            {sections.map((s) => {
              const ids = s.rows.map((r) => r.reclubUserId);
              const allOn = ids.every((id) => included.has(id));
              return (
                <section key={s.key} className="rounded-xl bg-snow/4 px-3 py-2">
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer">
                    <input type="checkbox" checked={allOn} onChange={() => toggleMany(ids, !allOn)} aria-label={`Ambil semua di ${s.title}`} className="w-4.5 h-4.5 accent-volt" />
                    {s.color && <span aria-hidden className="w-3.5 h-3.5 rounded-sm flex-none" style={{ background: s.color }} />}
                    <span className="font-bold text-sm" style={s.color ? { color: s.color } : undefined}>{s.title}</span>
                    <span className="text-xs text-snow/55">· {s.sub || `${s.rows.length} pemain`}</span>
                  </label>
                  {s.rows.map((r) => (
                    <ParticipantRow
                      key={r.reclubUserId}
                      r={r}
                      on={included.has(r.reclubUserId)}
                      onToggle={() => toggleMany([r.reclubUserId], !included.has(r.reclubUserId))}
                      value={choice[r.reclubUserId]}
                      onChoose={(v) => setChoice((prev) => ({ ...prev, [r.reclubUserId]: v || NEW }))}
                      options={optionsFor(r)}
                      gender={gender[r.reclubUserId]}
                      onGender={(g) => setGender((prev) => ({ ...prev, [r.reclubUserId]: g }))}
                      dupe={showErrors && dupes.has(choice[r.reclubUserId])}
                      genderMissing={showErrors && !gender[r.reclubUserId]}
                    />
                  ))}
                </section>
              );
            })}
          </div>

          {showErrors && (
            <div role="alert" className="bg-loss/12 rounded-xl px-4 py-3 text-sm text-coral-soft flex flex-col gap-1">
              {!chosenRows.length && <span>Centang minimal 1 peserta.</span>}
              {dupes.size > 0 && <span>Satu pemain dipilih untuk dua peserta Reclub.</span>}
              {missingGender.length > 0 && <span>Pilih gender untuk pemain baru: {missingGender.map((r) => r.name).join(", ")}.</span>}
            </div>
          )}
          {error && <div role="alert" className="text-sm text-coral-soft">{error}</div>}

          <div className="flex justify-between items-center gap-2 flex-wrap">
            <button type="button" onClick={() => setPreview(null)} disabled={pending} className="btn min-h-11">← Meet lain</button>
            <div className="flex items-center gap-3">
              <span className="text-caption text-snow/70">{chosenRows.length} diambil{newCount ? ` · ${newCount} pemain baru` : ""}</span>
              <button type="button" onClick={submit} disabled={pending} data-loading={busy === "import" || undefined} className="btn btn-volt min-h-11">Masukkan</button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** One participant: tick, Reclub photo + name, and which of our players it becomes (or a new one). */
function ParticipantRow({
  r,
  on,
  onToggle,
  value,
  onChoose,
  options,
  gender,
  onGender,
  dupe,
  genderMissing,
}: {
  r: ReclubImportRow;
  on: boolean;
  onToggle: () => void;
  value: string;
  onChoose: (v: string) => void;
  options: SearchOption[];
  gender: "M" | "F" | "";
  onGender: (g: "M" | "F" | "") => void;
  dupe: boolean;
  genderMissing: boolean;
}) {
  const isNew = value === NEW;
  return (
    <div className={`grid grid-cols-[auto_auto_1fr] sm:grid-cols-[auto_auto_1fr_15rem] gap-x-3 gap-y-2 items-center py-2 border-t border-snow/7 ${on ? "" : "opacity-55"}`}>
      <input type="checkbox" checked={on} onChange={onToggle} aria-label={`Ambil ${r.name}`} className="w-4.5 h-4.5 accent-volt" />
      <Avatar name={r.name} photoUrl={r.imageUrl} size={36} />
      <div className="min-w-0">
        <div className="font-bold text-sm truncate">{r.name}{r.username && <span className="font-normal text-snow/55"> @{r.username}</span>}</div>
        {(r.isHost || (!isNew && value === r.playerId && HOW_LABEL[r.how])) && (
          <div className="flex gap-1.5 flex-wrap mt-1">
            {r.isHost && <Badge tone="faint">Host</Badge>}
            {!isNew && value === r.playerId && HOW_LABEL[r.how] && <Badge tone={r.how === "linked" ? "win" : "volt"}>{HOW_LABEL[r.how]}</Badge>}
          </div>
        )}
      </div>
      <div className="col-span-3 sm:col-span-1 flex gap-1.5 min-w-0">
        <SearchSelect
          aria-label={`Pemain untuk ${r.name}`}
          aria-invalid={on && dupe}
          value={value}
          onChange={onChoose}
          options={options}
          disabled={!on}
          className={`${compactInputClass} flex-1 px-2 min-w-0 ${invalidIf(on && dupe)}`}
        />
        {isNew && !r.gender && (
          <select
            aria-label={`Gender ${r.name}`}
            value={gender}
            disabled={!on}
            onChange={(e) => onGender(e.target.value as "M" | "F" | "")}
            className={`${compactInputClass} w-16 px-2 ${invalidIf(on && genderMissing)}`}
          >
            <option value="">M/F</option>
            <option value="M">M</option>
            <option value="F">F</option>
          </select>
        )}
      </div>
    </div>
  );
}
