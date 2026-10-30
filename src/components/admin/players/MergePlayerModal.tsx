"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { Spinner } from "@/components/ui/Spinner";
import { inputClass } from "@/components/ui/Field";
import { toast } from "@/components/ui/Toast";
import { unwrap } from "@/lib/actionState";
import { similarPlayers } from "@/lib/reclub";
import { footprintParts, type PlayerFootprint } from "@/lib/playerMerge";
import { mergePlayersAction, previewPlayerMerge } from "@/app/admin/actions";
import type { Player } from "@/lib/database.types";

type Preview = { source: PlayerFootprint; target: PlayerFootprint; blockers: string[] };

/**
 * "Gabungkan pemain": `source` is a duplicate of someone already in the list. Pick the player that
 * stays, check what moves over, and merge: the duplicate's matches, points, events, coaching and
 * account go to that player, then the duplicate is deleted. Players with a similar name are offered
 * first.
 */
export function MergePlayerModal({ source, players, onClose }: { source: Player; players: Player[]; onClose: () => void }) {
  const router = useRouter();
  const [targetId, setTargetId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [merging, startMerge] = useTransition();

  const others = useMemo(() => players.filter((p) => p.id !== source.id), [players, source.id]);
  const suggested = useMemo(() => similarPlayers([source.name], others), [source.name, others]);
  const target = others.find((p) => p.id === targetId) ?? null;

  // the latest pick wins: an answer for a player picked before it is dropped
  const latest = useRef("");
  const pick = (id: string) => {
    setTargetId(id);
    setPreview(null);
    setError(null);
    latest.current = id;
    if (!id) return;
    setLoading(true);
    previewPlayerMerge(source.id, id)
      .then((res) => latest.current === id && (res.error ? setError(res.error) : setPreview(unwrap(res))))
      .finally(() => latest.current === id && setLoading(false));
  };

  const merge = () =>
    startMerge(async () => {
      try {
        const res = unwrap(await mergePlayersAction(source.id, targetId));
        toast.success(`${source.name} digabung ke ${res.targetName}.${res.notes.length ? ` ${res.notes.join(" ")}` : ""}`);
        onClose();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });

  const moving = preview ? footprintParts(preview.source) : [];
  return (
    <Modal title="Gabungkan pemain duplikat" onClose={onClose} width={560} closeOnBackdropClick={!merging}>
      <div className="text-sm text-snow/75">
        Semua data <b className="text-snow">{source.name}</b> dipindah ke pemain yang dipilih, lalu <b className="text-snow">{source.name}</b> dihapus. Riwayat match, poin, event dan coaching tidak hilang.
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-sm font-bold">Gabungkan ke</div>
        {suggested.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            <span className="text-xs text-snow/60 self-center">Nama mirip:</span>
            {suggested.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pick(p.id)}
                aria-pressed={targetId === p.id}
                className={`border-none rounded-full px-3 py-1.5 text-xs font-semibold ${targetId === p.id ? "bg-volt text-ink" : "bg-snow/8 text-snow hover:bg-snow/12"}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
        <SearchSelect
          aria-label="Pemain tujuan"
          value={targetId}
          onChange={pick}
          placeholder="Cari pemain yang benar"
          options={others.map((p) => ({ value: p.id, label: p.name, hint: [p.level, p.region, `${p.points} poin`].filter(Boolean).join(" · ") }))}
          className={inputClass}
        />
      </div>

      {target && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Side label="Dihapus" player={source} footprint={preview?.source} tone="text-coral-soft" />
          <Side label="Tetap" player={target} footprint={preview?.target} tone="text-volt" />
        </div>
      )}
      {loading && <div className="text-caption text-snow/60 flex items-center gap-2"><Spinner label={null} /> Mengecek data…</div>}

      {preview && preview.blockers.length > 0 && (
        <div role="alert" className="bg-loss/12 rounded-xl px-4 py-3 text-sm text-coral-soft flex flex-col gap-1">
          <b>Belum bisa digabung:</b>
          {preview.blockers.map((b) => <span key={b}>{b}</span>)}
        </div>
      )}
      {preview && !preview.blockers.length && target && (
        <div className="text-sm text-snow/80">
          {moving.length ? <>Pindah ke <b className="text-snow">{target.name}</b>: {moving.join(" · ")}.</> : <>{source.name} belum punya data apa pun; hasilnya sama dengan menghapusnya.</>}
          {preview.source.accountEmail && <> Akun {preview.source.accountEmail} ikut pindah.</>}
        </div>
      )}
      {error && <div role="alert" className="text-sm text-coral-soft">{error}</div>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={merging} className="btn min-h-11">Batal</button>
        <button
          type="button"
          onClick={merge}
          disabled={!preview || preview.blockers.length > 0 || merging}
          data-loading={merging || undefined}
          className="btn btn-volt min-h-11"
        >
          Gabungkan
        </button>
      </div>
    </Modal>
  );
}

function Side({ label, player, footprint, tone }: { label: string; player: Player; footprint?: PlayerFootprint; tone: string }) {
  const parts = footprint ? footprintParts(footprint) : [];
  return (
    <div className="rounded-xl bg-snow/6 px-3.5 py-3 flex flex-col gap-2 min-w-0">
      <span className={`text-[11px] font-bold uppercase tracking-[0.1em] ${tone}`}>{label}</span>
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar name={player.name} photoUrl={player.photo_url} size={36} />
        <div className="min-w-0">
          <div className="font-bold text-sm truncate">{player.name}</div>
          <div className="text-xs text-snow/60 truncate">{[player.level, player.region, `${player.points} poin`].filter(Boolean).join(" · ")}</div>
        </div>
      </div>
      {footprint && (
        <div className="text-xs text-snow/70">
          {parts.length ? parts.join(" · ") : "Belum ada data"}
          {footprint.accountEmail && <div>Akun: {footprint.accountEmail}</div>}
        </div>
      )}
    </div>
  );
}
