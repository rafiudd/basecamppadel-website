"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useMatchControl } from "@/lib/useMatchControl";
import { POINT_OPTIONS } from "@/lib/config";
import { finalizeMatch } from "@/app/admin/actions";
import type { Court, Match, Player, Serve, Venue } from "@/lib/database.types";

type Side = "A" | "B";

const inputCls =
  "bg-snow/10 border-none rounded-lg px-3.5 py-3 font-display font-bold text-[20px] text-snow w-full box-border outline-none focus:shadow-[inset_0_0_0_2px_#FFD43B]";

/** ISO string -> "YYYY-MM-DDTHH:mm" in the browser's local timezone, for <input type="datetime-local">. */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScoreControl({
  initial,
  players,
  courts,
  venues,
}: {
  initial: Match;
  players: Player[];
  courts: Court[];
  venues: Venue[];
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const {
    m,
    finished,
    saving,
    error,
    setError,
    update,
    setSet,
    setGame,
    setServe,
    toggleLive,
    toggleTimer,
    resetTimer,
    resetScore,
    timerText,
  } = useMatchControl(initial);

  const setTeamPlayers = (side: Side, ids: string[]) => {
    const names = ids.map((id) => players.find((p) => p.id === id)?.name).filter(Boolean).join(" / ");
    update(
      side === "A"
        ? { team_a_player_ids: ids, ...(names ? { team_a_name: names } : {}) }
        : { team_b_player_ids: ids, ...(names ? { team_b_name: names } : {}) },
    );
  };

  // ---- finalize
  const [showFinalize, setShowFinalize] = useState(false);
  const [winner, setWinner] = useState<Serve>("A");
  const [winPts, setWinPts] = useState(15);
  const [lossPts, setLossPts] = useState(-5);

  const doFinalize = () => {
    setError(null);
    startTransition(async () => {
      try {
        await finalizeMatch(m.id, winner, winPts, lossPts);
        setShowFinalize(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  const copyOverlayLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/overlay?match=${m.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Gagal menyalin link — salin manual dari address bar /overlay?match=" + m.id);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="font-display font-bold text-[26px]">Score Control</div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <button type="button" onClick={copyOverlayLink} className="btn py-2 px-3.5 text-xs bg-snow/10">
              {copied ? "Link disalin ✓" : "Salin link overlay (buat OBS)"}
            </button>
            <span className="text-xs text-snow/40">{saving ? "menyimpan…" : "tersimpan"}</span>
          </div>
        </div>
        <button
          onClick={toggleLive}
          disabled={finished}
          className="btn rounded-full px-[22px] py-3"
          style={{ background: m.is_live ? "#FF5A3C" : "rgba(251,247,241,0.12)" }}
        >
          {m.is_live ? "● LIVE — klik untuk OFF AIR" : "OFF AIR — klik untuk LIVE"}
        </button>
      </div>

      {error && <div className="text-sm text-loss bg-loss/15 rounded-lg px-3 py-2">{error}</div>}
      {finished && (
        <div className="text-sm bg-win/15 text-win rounded-lg px-3 py-2">
          Match sudah difinalisasi (pemenang: Tim {m.winner}). Skor terkunci.
        </div>
      )}

      {/* team cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {(["A", "B"] as const).map((side) => {
          const name = side === "A" ? m.team_a_name : m.team_b_name;
          const sets = side === "A" ? m.team_a_sets : m.team_b_sets;
          const game = side === "A" ? m.team_a_game : m.team_b_game;
          const ids = side === "A" ? m.team_a_player_ids : m.team_b_player_ids;
          const serving = m.serve === side;
          return (
            <div
              key={side}
              className="bg-indigo rounded-2xl p-6 flex flex-col gap-4"
              style={{ boxShadow: serving ? "inset 0 0 0 2px #FFD43B" : undefined }}
            >
              <input
                className={inputCls}
                value={name}
                disabled={finished}
                onChange={(e) =>
                  update(side === "A" ? { team_a_name: e.target.value } : { team_b_name: e.target.value }, `name${side}`)
                }
                aria-label={`Nama tim ${side}`}
              />

              <PlayerPicker players={players} selected={ids ?? []} disabled={finished} onChange={(v) => setTeamPlayers(side, v)} />

              <div className="flex gap-4">
                {([0, 1] as const).map((i) => (
                  <div key={i} className="flex-1">
                    <div className="label">Set {i + 1}</div>
                    <div className="flex items-center gap-2.5">
                      <button className="btn w-9 h-9 p-0 rounded-lg text-lg bg-snow/15" disabled={finished} onClick={() => setSet(side, i, -1)} aria-label="kurang">–</button>
                      <div className="flex-1 text-center font-display font-bold text-[22px]">{sets?.[i] ?? 0}</div>
                      <button className="btn w-9 h-9 p-0 rounded-lg text-lg bg-snow/15" disabled={finished} onClick={() => setSet(side, i, 1)} aria-label="tambah">+</button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="label">Skor game</div>
                <div className="flex gap-2">
                  {POINT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      disabled={finished}
                      onClick={() => setGame(side, opt)}
                      className="flex-1 py-2.5 rounded-lg font-bold text-[15px] border-none"
                      style={{
                        background: game === opt ? "#FFD43B" : "rgba(251,247,241,0.12)",
                        color: game === opt ? "#1B1650" : "#FBF7F1",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <button
                disabled={finished}
                onClick={() => setServe(side)}
                className="btn py-3"
                style={{ background: serving ? "#FFD43B" : "rgba(251,247,241,0.12)", color: serving ? "#1B1650" : "#FBF7F1" }}
              >
                {serving ? "Sedang Serve" : "Jadikan Server"}
              </button>
            </div>
          );
        })}
      </div>

      {/* session / timer */}
      <div className="bg-ink-3 rounded-2xl p-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="label">Sesi</div>
            <input className="field" value={m.session_label} onChange={(e) => update({ session_label: e.target.value }, "sess")} />
          </div>
          <div>
            <div className="label">Venue</div>
            <select className="field" value={m.venue} onChange={(e) => update({ venue: e.target.value })}>
              {!m.venue && <option value="">— pilih venue —</option>}
              {venues.map((v) => (
                <option key={v.id} value={v.name}>{v.name}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="label">Court</div>
            <select className="field" value={m.court_id ?? ""} onChange={(e) => update({ court_id: e.target.value || null })}>
              <option value="">— tanpa court —</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="label">Label set</div>
            <input className="field" value={m.set_label} onChange={(e) => update({ set_label: e.target.value }, "setlabel")} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="label">Mulai</div>
            <input
              className="field"
              type="datetime-local"
              value={toLocalInputValue(m.starts_at)}
              onChange={(e) =>
                update({ starts_at: e.target.value ? new Date(e.target.value).toISOString() : null }, "startsAt")
              }
            />
          </div>
          <div>
            <div className="label">Selesai</div>
            <input
              className="field"
              type="datetime-local"
              value={toLocalInputValue(m.ends_at)}
              onChange={(e) => update({ ends_at: e.target.value ? new Date(e.target.value).toISOString() : null }, "endsAt")}
            />
          </div>
        </div>

        <div>
          <div className="label">URL stream YouTube</div>
          <input
            className="field"
            type="url"
            placeholder="https://youtube.com/live/..."
            value={m.stream_url ?? ""}
            onChange={(e) => update({ stream_url: e.target.value || null }, "stream")}
          />
        </div>

        <div className="flex items-center gap-4 pt-2 border-t border-snow/10 flex-wrap">
          <div className="font-display font-bold text-[28px] text-volt min-w-[110px] tabular-nums">{timerText}</div>
          <button className="btn btn-coral" onClick={toggleTimer}>{m.timer_running ? "PAUSE" : "START"}</button>
          <button className="btn" onClick={resetTimer}>RESET</button>
          <div className="flex-1" />
          <button className="btn" disabled={finished} onClick={resetScore}>Reset Skor</button>
          <button className="btn btn-volt" disabled={finished || pending} onClick={() => setShowFinalize((v) => !v)}>
            Selesaikan Match
          </button>
        </div>

        {showFinalize && !finished && (
          <div className="border border-volt/40 rounded-xl p-4 flex flex-col gap-3 bg-ink/40">
            <div className="font-bold">Finalisasi match</div>
            <p className="text-xs text-snow/60">
              Menulis riwayat match untuk setiap pemain yang terhubung ke tim (result, poin, link stream), memperbarui poin/W-L pemain, dan mematikan LIVE.
              {(m.team_a_player_ids?.length ?? 0) + (m.team_b_player_ids?.length ?? 0) === 0 && (
                <b className="text-loss block mt-1">Belum ada pemain terhubung — riwayat tidak akan tercatat ke siapa pun.</b>
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="label">Pemenang</div>
                <select className="field" value={winner} onChange={(e) => setWinner(e.target.value as Serve)}>
                  <option value="A">{m.team_a_name}</option>
                  <option value="B">{m.team_b_name}</option>
                </select>
              </div>
              <div>
                <div className="label">Poin menang</div>
                <input className="field" type="number" value={winPts} onChange={(e) => setWinPts(Number(e.target.value))} />
              </div>
              <div>
                <div className="label">Poin kalah</div>
                <input className="field" type="number" value={lossPts} onChange={(e) => setLossPts(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn" onClick={() => setShowFinalize(false)}>Batal</button>
              <button className="btn btn-coral" disabled={pending} onClick={doFinalize}>
                {pending ? "..." : "Konfirmasi & Simpan Hasil"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerPicker({
  players,
  selected,
  disabled,
  onChange,
}: {
  players: Player[];
  selected: string[];
  disabled: boolean;
  onChange: (ids: string[]) => void;
}) {
  const slots = [selected[0] ?? "", selected[1] ?? ""];
  const set = (i: number, v: string) => {
    const next = [...slots];
    next[i] = v;
    onChange(next.filter(Boolean));
  };
  return (
    <div>
      <div className="label">Pemain (opsional — untuk riwayat & leaderboard)</div>
      <div className="grid grid-cols-2 gap-2">
        {slots.map((val, i) => (
          <select key={i} className="field text-sm" value={val} disabled={disabled} onChange={(e) => set(i, e.target.value)}>
            <option value="">— pilih —</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.gender})
              </option>
            ))}
          </select>
        ))}
      </div>
    </div>
  );
}
