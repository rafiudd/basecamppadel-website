"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, GenderBadge } from "@/components/ui/Badge";
import { CloseIcon, FilterIcon, SearchIcon } from "@/components/ui/icons";
import { inputClass } from "@/components/ui/Field";
import { PlayerDelete } from "@/components/admin/players/PlayerDelete";
import { MergePlayerModal, type MergeCandidate } from "@/components/admin/players/MergePlayerModal";
import { PlayerProfileModal } from "@/components/admin/players/PlayerProfileModal";
import { LinkPagination } from "@/components/ui/Pagination";
import { LEVELS } from "@/lib/config";
import {
  PLAYER_ACTIVITIES,
  playerListHref,
  type PlayerActivity,
  type PlayerListQuery,
  type PlayerSort,
} from "@/lib/adminPlayersQuery";
import type { AdminPlayersPage } from "@/lib/server/adminPlayers";
import type { Player } from "@/lib/database.types";

const GENDER_LABELS = { M: "Men", F: "Women" } as const;
const SEARCH_DEBOUNCE_MS = 350;

function Actions({ p, onMerge }: { p: Player; onMerge: () => void }) {
  return (
    <div className="flex items-center gap-1 justify-end">
      <Link href={`/admin/players?edit=${p.id}`} className="btn min-h-10 px-4.5 tracking-button no-underline text-snow">Edit</Link>
      <PlayerDelete player={p} onMerge={onMerge} />
    </div>
  );
}

/** "Reclub" pill on players linked to a Reclub account (hover shows which one). */
function ReclubBadge({ p }: { p: Player }) {
  if (p.reclub_user_id == null) return null;
  const who = p.reclub_username ? `@${p.reclub_username}` : p.reclub_name || `#${p.reclub_user_id}`;
  return (
    <span title={`Tertaut ke Reclub ${who}`}>
      <Badge tone="muted">
        <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-volt" />
        Reclub
      </Badge>
    </span>
  );
}

/** Admin player list: one server-rendered page of players. Search, filters, sort and page live in
 *  the URL (see lib/adminPlayersQuery.ts) and run in the database, so only the shown rows load. */
export function PlayersList({
  rows,
  shown,
  total,
  page,
  totalPages,
  chipCounts,
  query,
  mergeCandidates,
}: AdminPlayersPage & {
  query: PlayerListQuery;
  /** Every player (id / name / level / region / points) for the merge picker. */
  mergeCandidates: MergeCandidate[];
}) {
  const router = useRouter();
  const [q, setQ] = useState(query.q);
  const [coachingCountInput, setCoachingCountInput] = useState(query.coachingCount ?? null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coachingCountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [profilePlayer, setProfilePlayer] = useState<Player | null>(null);
  const [mergeSource, setMergeSource] = useState<Player | null>(null);
  const { level, sort, gender, activity, coachingCount, noAccount, noPhoto } = query;

  /** Any filter / sort change goes back to page 1. */
  const hrefWith = (patch: Partial<PlayerListQuery>) => playerListHref({ ...query, page: 1, ...patch });
  const go = (patch: Partial<PlayerListQuery>) => router.push(hrefWith(patch));
  const onSearch = (value: string) => {
    setQ(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => router.replace(hrefWith({ q: value.trim() })), SEARCH_DEBOUNCE_MS);
  };
  // The chip to clear this filter (and any direct URL nav) updates `query` without remounting —
  // keep the input in sync when that happens outside of typing into it.
  useEffect(() => setCoachingCountInput(query.coachingCount ?? null), [query.coachingCount]);
  const onCoachingCount = (value: string) => {
    const n = value.trim() === "" ? null : Math.max(0, Math.floor(Number(value)));
    setCoachingCountInput(Number.isInteger(n) ? n : null);
    if (coachingCountTimer.current) clearTimeout(coachingCountTimer.current);
    coachingCountTimer.current = setTimeout(() => go({ coachingCount: Number.isInteger(n) ? n : null }), SEARCH_DEBOUNCE_MS);
  };

  const chips = [
    { id: "" as const, label: "Semua", n: chipCounts.all },
    { id: "M" as const, label: GENDER_LABELS.M, n: chipCounts.M },
    { id: "F" as const, label: GENDER_LABELS.F, n: chipCounts.F },
  ];
  const missing = [
    { label: "Belum punya akun", on: noAccount, set: (on: boolean) => go({ noAccount: on }), n: chipCounts.noAccount },
    { label: "Belum ada foto", on: noPhoto, set: (on: boolean) => go({ noPhoto: on }), n: chipCounts.noPhoto },
  ];
  const chipClass = (on: boolean) =>
    `border-none rounded-full min-h-10 pl-3.5 pr-2 py-2 text-sm font-semibold whitespace-nowrap cursor-pointer inline-flex items-center gap-2 ${on ? "bg-indigo text-snow" : "bg-snow/10 text-snow/80"}`;
  /** The chip's player count, set apart from the label as its own small badge. */
  const count = (n: number, on: boolean) => (
    <span className={`min-w-6 h-6 px-1.5 rounded-full text-xs font-bold tabular-nums inline-flex items-center justify-center ${on ? "bg-volt text-ink" : "bg-snow/10 text-snow/70"}`}>{n}</span>
  );

  // Every filter in effect, as a removable chip under the toolbar: the panel can stay closed and
  // the admin still sees why the list is shorter.
  type ActiveFilter = { label: string; clear: Partial<PlayerListQuery> };
  const candidates: (ActiveFilter | null)[] = [
    gender ? { label: GENDER_LABELS[gender], clear: { gender: "" } } : null,
    level ? { label: level, clear: { level: "" } } : null,
    activity ? { label: PLAYER_ACTIVITIES[activity], clear: { activity: "" } } : null,
    coachingCount != null ? { label: `Total coaching ≥ ${coachingCount}`, clear: { coachingCount: null } } : null,
    noAccount ? { label: "Belum punya akun", clear: { noAccount: false } } : null,
    noPhoto ? { label: "Belum ada foto", clear: { noPhoto: false } } : null,
  ];
  const active = candidates.filter((f): f is ActiveFilter => !!f);
  const clearAll = () => {
    setCoachingCountInput(null);
    go({ gender: "", level: "", activity: "", coachingCount: null, noAccount: false, noPhoto: false });
  };

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-2 flex-wrap">
          <div className="relative w-full md:w-auto md:flex-1 md:min-w-55">
            <SearchIcon className="absolute left-3 top-3 text-snow/65" />
            <input aria-label="Cari pemain" placeholder="Cari nama atau region" value={q} onChange={(e) => onSearch(e.target.value)} className={`${inputClass} pl-10`} />
          </div>
          <select aria-label="Urutkan" value={sort} onChange={(e) => go({ sort: e.target.value as PlayerSort })} className={`${inputClass} flex-1 basis-0 min-w-0 md:flex-none md:w-45`}>
            <option value="poin">Urutkan: Poin</option>
            <option value="nama">Urutkan: Nama</option>
            <option value="wl">Urutkan: W-L</option>
            <option value="match">Urutkan: Match</option>
            <option value="coaching">Urutkan: Coaching</option>
            <option value="rapor">Urutkan: Rapor</option>
          </select>
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="players-filters"
            aria-label={active.length ? `Filter, ${active.length} aktif` : "Filter"}
            onClick={() => setFiltersOpen((v) => !v)}
            className={`flex-none border-none rounded-lg min-h-11 px-3.5 inline-flex items-center gap-2 text-sm font-semibold cursor-pointer ${filtersOpen || active.length ? "bg-indigo text-snow" : "bg-snow/10 text-snow/80"}`}
          >
            <FilterIcon />
            <span className="hidden md:inline">Filter</span>
            {active.length > 0 && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-volt text-ink text-xs font-bold inline-flex items-center justify-center">{active.length}</span>
            )}
          </button>
        </div>

        {filtersOpen && (
          <div id="players-filters" className="bg-ink-3 rounded-card p-4 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <div className="label">Gender</div>
              <div className="flex gap-2 flex-wrap">
                {chips.map((c) => (
                  <button key={c.label} type="button" aria-pressed={gender === c.id} onClick={() => go({ gender: c.id })} className={chipClass(gender === c.id)}>
                    {c.label} {count(c.n, gender === c.id)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="label">Kelengkapan data</div>
              <div className="flex gap-2 flex-wrap">
                {missing.map((c) => (
                  <button key={c.label} type="button" aria-pressed={c.on} onClick={() => c.set(!c.on)} className={chipClass(c.on)}>
                    {c.label} {count(c.n, c.on)}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-2">
              <span className="label">Level</span>
              <select value={level} onChange={(e) => go({ level: e.target.value })} className={inputClass}>
                <option value="">Semua level</option>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="label">Coaching & rapor</span>
              <select value={activity} onChange={(e) => go({ activity: e.target.value as PlayerActivity })} className={inputClass}>
                <option value="">Semua</option>
                {Object.entries(PLAYER_ACTIVITIES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="label">Total coaching (minimal)</span>
              <input
                type="number"
                min={0}
                step={1}
                placeholder="misal 5"
                value={coachingCountInput ?? ""}
                onChange={(e) => onCoachingCount(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
        )}

        {active.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-snow/65 whitespace-nowrap">{shown} dari {total} pemain</span>
            {active.map((f) => (
              <button
                key={f.label}
                type="button"
                aria-label={`Hapus filter ${f.label}`}
                onClick={() => go(f.clear)}
                className="border-none rounded-full min-h-8 pl-3 pr-2 py-1 text-xs font-semibold whitespace-nowrap cursor-pointer bg-volt/15 text-volt inline-flex items-center gap-1 hover:bg-volt/25"
              >
                {f.label} <CloseIcon size={14} />
              </button>
            ))}
            <button type="button" onClick={clearAll} className="border-none bg-transparent p-0 text-xs font-semibold text-snow/65 underline cursor-pointer hover:text-snow">
              Hapus semua
            </button>
          </div>
        )}
      </div>

      <table className="hidden md:table w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs text-snow/65 uppercase tracking-table">
            <th className="pb-2.5 pr-3 font-semibold" />
            <th className="pb-2.5 pr-3 font-semibold">Nama</th>
            <th className="pb-2.5 pr-3 font-semibold">Level</th>
            <th className="pb-2.5 pr-3 font-semibold">Coaching</th>
            <th className="pb-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className={`border-t border-snow/10 ${p.active ? "" : "opacity-50"}`}>
              <td className="py-2 pr-3"><Avatar name={p.name} photoUrl={p.photo_url} size={36} /></td>
              <td className="py-2.5 pr-3 font-display font-bold whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setProfilePlayer(p)}
                  className="border-0 bg-transparent cursor-pointer p-0 flex items-center gap-2 font-display font-bold text-snow hover:text-volt"
                >
                  {p.name} <GenderBadge gender={p.gender} /> <ReclubBadge p={p} />
                </button>
              </td>
              <td className="py-2.5 pr-3 text-snow/80 whitespace-nowrap">{p.level}</td>
              <td className="py-2.5 pr-3 text-snow/80 whitespace-nowrap">{p.coachingCount}×</td>
              <td className="py-2"><Actions p={p} onMerge={() => setMergeSource(p)} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="md:hidden flex flex-col gap-2">
        {rows.map((p) => (
          <div key={p.id} className={`bg-ink-3 rounded-card py-3 pl-3.5 pr-2 flex items-center gap-3 ${p.active ? "" : "opacity-50"}`}>
            <Avatar name={p.name} photoUrl={p.photo_url} size={36} />
            <button type="button" onClick={() => setProfilePlayer(p)} className="flex-1 min-w-0 border-0 bg-transparent cursor-pointer text-left p-0">
              <div className="font-display font-bold text-input flex items-center gap-2 text-snow">{p.name} <GenderBadge gender={p.gender} /> <ReclubBadge p={p} /></div>
              <div className="text-caption text-snow/70">{p.level}</div>
              <div className="text-caption text-snow/70">{p.coachingCount}× coaching</div>
            </button>
            <Actions p={p} onMerge={() => setMergeSource(p)} />
          </div>
        ))}
      </div>

      {shown === 0 && <p className="text-sm text-snow/50 m-0">{total ? "Tidak ada pemain yang cocok." : "Belum ada pemain."}</p>}

      <LinkPagination page={page} totalPages={totalPages} hrefFor={(p) => playerListHref({ ...query, page: p })} />

      {profilePlayer && <PlayerProfileModal player={profilePlayer} onClose={() => setProfilePlayer(null)} />}
      {mergeSource && <MergePlayerModal source={mergeSource} players={mergeCandidates} onClose={() => setMergeSource(null)} />}
    </>
  );
}
