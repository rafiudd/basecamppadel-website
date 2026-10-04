"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { GenderBadge } from "@/components/ui/Badge";
import { SearchIcon } from "@/components/ui/icons";
import { inputClass } from "@/components/ui/Field";
import { deletePlayer } from "@/app/admin/actions";
import { InlineDelete } from "@/components/admin/InlineDelete";
import { LEVELS } from "@/lib/config";
import type { Player } from "@/lib/database.types";

type Sort = "poin" | "nama" | "wl";

function Actions({ p }: { p: Player }) {
  return (
    <InlineDelete action={deletePlayer} id={p.id} name={p.name} noun="pemain">
      <Link href={`/admin/players?edit=${p.id}`} className="btn min-h-10 px-4.5 tracking-button no-underline text-snow">Edit</Link>
    </InlineDelete>
  );
}

export function PlayersList({ players }: { players: Player[] }) {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("");
  const [sort, setSort] = useState<Sort>("poin");
  const [gender, setGender] = useState<"" | "M" | "F">("");

  const term = q.trim().toLowerCase();
  const base = players.filter(
    (p) => (!term || p.name.toLowerCase().includes(term) || p.region.toLowerCase().includes(term)) && (!level || p.level === level),
  );
  const shown = base
    .filter((p) => !gender || p.gender === gender)
    .sort((a, b) =>
      sort === "nama"
        ? a.name.localeCompare(b.name)
        : sort === "wl"
          ? b.wins - b.losses - (a.wins - a.losses) || b.wins - a.wins
          : b.points - a.points || a.name.localeCompare(b.name),
    );
  const chips = [
    { id: "" as const, label: "Semua", n: base.length },
    { id: "M" as const, label: "Men", n: base.filter((p) => p.gender === "M").length },
    { id: "F" as const, label: "Women", n: base.filter((p) => p.gender === "F").length },
  ];

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-55">
            <SearchIcon className="absolute left-3 top-3 text-snow/65" />
            <input aria-label="Cari pemain" placeholder="Cari nama atau region" value={q} onChange={(e) => setQ(e.target.value)} className={`${inputClass} pl-10`} />
          </div>
          <select aria-label="Level" value={level} onChange={(e) => setLevel(e.target.value)} className={`${inputClass} flex-1 basis-0 min-w-0 md:flex-none md:w-50`}>
            <option value="">Semua level</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select aria-label="Urutkan" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={`${inputClass} flex-1 basis-0 min-w-0 md:flex-none md:w-45`}>
            <option value="poin">Urutkan: Poin</option>
            <option value="nama">Urutkan: Nama</option>
            <option value="wl">Urutkan: W-L</option>
          </select>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              aria-pressed={gender === c.id}
              onClick={() => setGender(c.id)}
              className={`border-none rounded-full min-h-10 px-3.5 py-2 text-sm font-semibold whitespace-nowrap ${gender === c.id ? "bg-indigo text-snow" : "bg-ink-3 text-snow/80"}`}
            >
              {c.label} {c.n}
            </button>
          ))}
        </div>
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
            <th className="pb-2.5" />
          </tr>
        </thead>
        <tbody>
          {shown.map((p) => (
            <tr key={p.id} className={`border-t border-snow/10 ${p.active ? "" : "opacity-50"}`}>
              <td className="py-2 pr-3"><Avatar name={p.name} photoUrl={p.photo_url} size={36} /></td>
              <td className="py-2.5 pr-3 font-display font-bold whitespace-nowrap">
                <span className="flex items-center gap-2">{p.name} <GenderBadge gender={p.gender} /></span>
              </td>
              <td className="py-2.5 pr-3 text-snow/80 whitespace-nowrap">{p.level}</td>
              <td className="py-2.5 pr-3 text-snow/80 whitespace-nowrap">{p.region || "—"}</td>
              <td className="py-2.5 pr-3 font-display font-bold">{p.points}</td>
              <td className="py-2.5 pr-3 text-snow/80 whitespace-nowrap">{p.wins}–{p.losses}</td>
              <td className="py-2"><Actions p={p} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="md:hidden flex flex-col gap-2">
        {shown.map((p) => (
          <div key={p.id} className={`bg-ink-3 rounded-card py-3 pl-3.5 pr-2 flex items-center gap-3 ${p.active ? "" : "opacity-50"}`}>
            <Avatar name={p.name} photoUrl={p.photo_url} size={36} />
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-input flex items-center gap-2">{p.name} <GenderBadge gender={p.gender} /></div>
              <div className="text-caption text-snow/70">{[p.level, p.region].filter(Boolean).join(" · ")}</div>
              <div className="text-caption text-snow/70"><b className="text-snow">{p.points}</b> poin · {p.wins}–{p.losses} W-L</div>
            </div>
            <Actions p={p} />
          </div>
        ))}
      </div>

      {shown.length === 0 && <p className="text-sm text-snow/50 m-0">{players.length ? "Tidak ada pemain yang cocok." : "Belum ada pemain."}</p>}
    </>
  );
}
