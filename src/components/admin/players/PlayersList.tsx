"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, GenderBadge } from "@/components/ui/Badge";
import { CloseIcon, FilterIcon, SearchIcon } from "@/components/ui/icons";
import { inputClass } from "@/components/ui/Field";
import { PlayerDelete } from "@/components/admin/players/PlayerDelete";
import { MergePlayerModal } from "@/components/admin/players/MergePlayerModal";
import { PlayerProfileModal } from "@/components/admin/players/PlayerProfileModal";
import { Pagination } from "@/components/ui/Pagination";
import { LEVELS } from "@/lib/config";
import type { Player } from "@/lib/database.types";

type Sort = "poin" | "nama" | "wl" | "match" | "coaching" | "rapor";

/** Coaching / rapor filter options: the label shown and the test on a player's two totals. */
const ACTIVITIES = {
  coached: { label: "Sudah pernah coaching", test: (coaching: number) => coaching > 0 },
  uncoached: { label: "Belum pernah coaching", test: (coaching: number) => coaching === 0 },
  rapor: { label: "Sudah punya rapor", test: (_coaching: number, rapor: number) => rapor > 0 },
  "no-rapor": { label: "Belum punya rapor", test: (_coaching: number, rapor: number) => rapor === 0 },
  "coached-no-rapor": { label: "Coaching, belum ada rapor", test: (coaching: number, rapor: number) => coaching > 0 && rapor === 0 },
} satisfies Record<string, { label: string; test: (coaching: number, rapor: number) => boolean }>;
type Activity = "" | keyof typeof ACTIVITIES;
const GENDER_LABELS = { M: "Men", F: "Women" } as const;

const PAGE_SIZE = 25;

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

export function PlayersList({
  players,
  coachingCounts,
  raporCounts,
  accountPlayerIds,
}: {
  players: Player[];
  coachingCounts: Record<string, number>;
  raporCounts: Record<string, number>;
  /** Players that already have a login account linked. */
  accountPlayerIds: string[];
}) {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("");
  const [sort, setSort] = useState<Sort>("poin");
  const [gender, setGender] = useState<"" | "M" | "F">("");
  const [activity, setActivity] = useState<Activity>("");
  const [noAccount, setNoAccount] = useState(false);
  const [noPhoto, setNoPhoto] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [profilePlayer, setProfilePlayer] = useState<Player | null>(null);
  const [mergeSource, setMergeSource] = useState<Player | null>(null);
  const [page, setPage] = useState(1);

  const matchCount = (p: Player) => p.wins + p.losses;
  const coachingCount = (p: Player) => coachingCounts[p.id] ?? 0;
  const raporCount = (p: Player) => raporCounts[p.id] ?? 0;
  const withAccount = useMemo(() => new Set(accountPlayerIds), [accountPlayerIds]);
  const lacksAccount = (p: Player) => !withAccount.has(p.id);
  const lacksPhoto = (p: Player) => !p.photo_url;
  const matchesActivity = (p: Player) => !activity || ACTIVITIES[activity].test(coachingCount(p), raporCount(p));
  const passGender = (p: Player) => !gender || p.gender === gender;
  const passAccount = (p: Player) => !noAccount || lacksAccount(p);
  const passPhoto = (p: Player) => !noPhoto || lacksPhoto(p);

  const term = q.trim().toLowerCase();
  const base = players.filter(
    (p) => (!term || p.name.toLowerCase().includes(term) || p.region.toLowerCase().includes(term)) && (!level || p.level === level) && matchesActivity(p),
  );
  const shown = base
    .filter((p) => passGender(p) && passAccount(p) && passPhoto(p))
    .sort((a, b) =>
      sort === "nama"
        ? a.name.localeCompare(b.name)
        : sort === "wl"
          ? b.wins - b.losses - (a.wins - a.losses) || b.wins - a.wins
          : sort === "match"
            ? matchCount(b) - matchCount(a) || a.name.localeCompare(b.name)
            : sort === "coaching"
              ? coachingCount(b) - coachingCount(a) || a.name.localeCompare(b.name)
              : sort === "rapor"
                ? raporCount(b) - raporCount(a) || a.name.localeCompare(b.name)
                : b.points - a.points || a.name.localeCompare(b.name),
    );
  // Each chip counts what picking it would show: every other filter applied, its own left out.
  const genderPool = base.filter((p) => passAccount(p) && passPhoto(p));
  const chips = [
    { id: "" as const, label: "Semua", n: genderPool.length },
    { id: "M" as const, label: GENDER_LABELS.M, n: genderPool.filter((p) => p.gender === "M").length },
    { id: "F" as const, label: GENDER_LABELS.F, n: genderPool.filter((p) => p.gender === "F").length },
  ];
  const missing = [
    { label: "Belum punya akun", on: noAccount, set: setNoAccount, n: base.filter((p) => passGender(p) && passPhoto(p) && lacksAccount(p)).length },
    { label: "Belum ada foto", on: noPhoto, set: setNoPhoto, n: base.filter((p) => passGender(p) && passAccount(p) && lacksPhoto(p)).length },
  ];
  const chipClass = (on: boolean) =>
    `border-none rounded-full min-h-10 pl-3.5 pr-2 py-2 text-sm font-semibold whitespace-nowrap cursor-pointer inline-flex items-center gap-2 ${on ? "bg-indigo text-snow" : "bg-snow/10 text-snow/80"}`;
  /** The chip's player count, set apart from the label as its own small badge. */
  const count = (n: number, on: boolean) => (
    <span className={`min-w-6 h-6 px-1.5 rounded-full text-xs font-bold tabular-nums inline-flex items-center justify-center ${on ? "bg-volt text-ink" : "bg-snow/10 text-snow/70"}`}>{n}</span>
  );

  // Every filter in effect, as a removable chip under the toolbar: the panel can stay closed and
  // the admin still sees why the list is shorter.
  const active = [
    gender && { label: GENDER_LABELS[gender], clear: () => setGender("") },
    level && { label: level, clear: () => setLevel("") },
    activity && { label: ACTIVITIES[activity].label, clear: () => setActivity("") },
    ...missing.map((m) => m.on && { label: m.label, clear: () => m.set(false) }),
  ].filter((f): f is { label: string; clear: () => void } => !!f);
  const clearAll = () => {
    for (const f of active) f.clear();
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pageStart = (clampedPage - 1) * PAGE_SIZE;
  const paged = shown.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-2 flex-wrap">
          <div className="relative w-full md:w-auto md:flex-1 md:min-w-55">
            <SearchIcon className="absolute left-3 top-3 text-snow/65" />
            <input aria-label="Cari pemain" placeholder="Cari nama atau region" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className={`${inputClass} pl-10`} />
          </div>
          <select aria-label="Urutkan" value={sort} onChange={(e) => { setSort(e.target.value as Sort); setPage(1); }} className={`${inputClass} flex-1 basis-0 min-w-0 md:flex-none md:w-45`}>
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
                  <button key={c.label} type="button" aria-pressed={gender === c.id} onClick={() => { setGender(c.id); setPage(1); }} className={chipClass(gender === c.id)}>
                    {c.label} {count(c.n, gender === c.id)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="label">Kelengkapan data</div>
              <div className="flex gap-2 flex-wrap">
                {missing.map((c) => (
                  <button key={c.label} type="button" aria-pressed={c.on} onClick={() => { c.set(!c.on); setPage(1); }} className={chipClass(c.on)}>
                    {c.label} {count(c.n, c.on)}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-2">
              <span className="label">Level</span>
              <select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }} className={inputClass}>
                <option value="">Semua level</option>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="label">Coaching & rapor</span>
              <select value={activity} onChange={(e) => { setActivity(e.target.value as Activity); setPage(1); }} className={inputClass}>
                <option value="">Semua</option>
                {Object.entries(ACTIVITIES).map(([id, a]) => <option key={id} value={id}>{a.label}</option>)}
              </select>
            </label>
          </div>
        )}

        {active.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-snow/65 whitespace-nowrap">{shown.length} dari {players.length} pemain</span>
            {active.map((f) => (
              <button
                key={f.label}
                type="button"
                aria-label={`Hapus filter ${f.label}`}
                onClick={() => { f.clear(); setPage(1); }}
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
            <th className="pb-2.5 pr-3 font-semibold">Region</th>
            <th className="pb-2.5 pr-3 font-semibold">Poin</th>
            <th className="pb-2.5 pr-3 font-semibold">W-L</th>
            <th className="pb-2.5 pr-3 font-semibold">Match</th>
            <th className="pb-2.5 pr-3 font-semibold">Coaching</th>
            <th className="pb-2.5 pr-3 font-semibold">Rapor</th>
            <th className="pb-2.5" />
          </tr>
        </thead>
        <tbody>
          {paged.map((p) => (
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
              <td className="py-2.5 pr-3 text-snow/80 whitespace-nowrap">{p.region || "—"}</td>
              <td className="py-2.5 pr-3 font-display font-bold">{p.points}</td>
              <td className="py-2.5 pr-3 text-snow/80 whitespace-nowrap">{p.wins}–{p.losses}</td>
              <td className="py-2.5 pr-3 text-snow/80 whitespace-nowrap">{matchCount(p)}×</td>
              <td className="py-2.5 pr-3 text-snow/80 whitespace-nowrap">{coachingCount(p)}×</td>
              <td className="py-2.5 pr-3 text-snow/80 whitespace-nowrap">{raporCount(p)}×</td>
              <td className="py-2"><Actions p={p} onMerge={() => setMergeSource(p)} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="md:hidden flex flex-col gap-2">
        {paged.map((p) => (
          <div key={p.id} className={`bg-ink-3 rounded-card py-3 pl-3.5 pr-2 flex items-center gap-3 ${p.active ? "" : "opacity-50"}`}>
            <Avatar name={p.name} photoUrl={p.photo_url} size={36} />
            <button type="button" onClick={() => setProfilePlayer(p)} className="flex-1 min-w-0 border-0 bg-transparent cursor-pointer text-left p-0">
              <div className="font-display font-bold text-input flex items-center gap-2 text-snow">{p.name} <GenderBadge gender={p.gender} /> <ReclubBadge p={p} /></div>
              <div className="text-caption text-snow/70">{[p.level, p.region].filter(Boolean).join(" · ")}</div>
              <div className="text-caption text-snow/70"><b className="text-snow">{p.points}</b> poin · {p.wins}–{p.losses} W-L</div>
              <div className="text-caption text-snow/70">{matchCount(p)}× match · {coachingCount(p)}× coaching · {raporCount(p)}× rapor</div>
            </button>
            <Actions p={p} onMerge={() => setMergeSource(p)} />
          </div>
        ))}
      </div>

      {shown.length === 0 && <p className="text-sm text-snow/50 m-0">{players.length ? "Tidak ada pemain yang cocok." : "Belum ada pemain."}</p>}

      <Pagination page={clampedPage} totalPages={totalPages} onChange={setPage} />

      {profilePlayer && <PlayerProfileModal player={profilePlayer} onClose={() => setProfilePlayer(null)} />}
      {mergeSource && <MergePlayerModal source={mergeSource} players={players} onClose={() => setMergeSource(null)} />}
    </>
  );
}
