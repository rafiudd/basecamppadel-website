"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { initials, formatDayMonthYear } from "@/lib/format";
import { LEVEL_DEFINITIONS, type PlayerLevelName } from "@/lib/coaching";
import { getPlayerCoachingProfile, type PlayerCoachingProfile } from "../player-profile-actions";

/** "Lihat profil" from the coaching editor: player info + full coaching note history, in a popup
 *  instead of navigating away to the public leaderboard page. */
export function PlayerProfileModal({ playerId, onClose }: { playerId: string; onClose: () => void }) {
  const [data, setData] = useState<PlayerCoachingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPlayerCoachingProfile(playerId)
      .then((res) => {
        if (cancelled) return;
        if (!res) setError(true);
        else setData(res);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  return (
    <Modal title="Profil pemain" onClose={onClose} width={560}>
      {loading && <div className="text-sm text-snow/60 py-6 text-center">Memuat…</div>}
      {!loading && error && <div className="text-sm text-loss py-6 text-center">Gagal memuat profil pemain.</div>}
      {!loading && data && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3.5">
            {data.player.photo_url ? (
              <Avatar name={data.player.name} photoUrl={data.player.photo_url} size={48} />
            ) : (
              <span
                aria-hidden="true"
                className="w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-base flex-none"
                style={{
                  backgroundColor: LEVEL_DEFINITIONS[data.player.level as PlayerLevelName]?.color || "#FFD43B",
                  color: LEVEL_DEFINITIONS[data.player.level as PlayerLevelName]?.textColor || "#17151F",
                }}
              >
                {initials(data.player.name)}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-xl">{data.player.name}</div>
              <div className="text-sm text-snow/65">
                {data.player.gender === "F" ? "Women" : "Men"} · {data.player.level || "Beginner"} · {data.player.region || "Purwokerto"}
              </div>
            </div>
            <span className="flex-none rounded-full bg-volt/14 text-volt px-3 py-1.5 text-xs font-bold whitespace-nowrap">
              Sudah coaching {data.sessionCount}×
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-xs font-bold tracking-caps text-snow/60">CATATAN SEBELUMNYA</div>
            {data.history.length === 0 ? (
              <div className="text-sm text-snow/50">Belum ada catatan coaching.</div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-1">
                {data.history.map((h) => (
                  <div key={h.id} className="bg-ink rounded-xl p-4 flex flex-col gap-2 border border-snow/8">
                    <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-snow/60">
                      <span className="font-bold text-snow">{h.sessionTitle}</span>
                      <span className="flex items-center gap-2">
                        {h.sessionDate && formatDayMonthYear(h.sessionDate)}
                        {h.coachName && ` · Coach ${h.coachName}`}
                        <span
                          className={`rounded-full px-2 py-0.5 text-2xs font-bold ${
                            h.status === "submitted" ? "bg-win/20 text-win-soft" : "bg-volt/18 text-volt"
                          }`}
                        >
                          {h.status === "submitted" ? "Terkirim" : "Draft"}
                        </span>
                      </span>
                    </div>
                    {h.evaluation && <p className="text-sm text-snow/85 whitespace-pre-line m-0">{h.evaluation}</p>}
                    {h.nextPractice && (
                      <div className="bg-volt/10 border border-volt/25 rounded-lg p-2.5">
                        <span className="text-2xs uppercase tracking-wider font-bold text-snow/70">Latihan berikutnya</span>
                        <p className="text-xs text-snow/80 whitespace-pre-line m-0 mt-1">{h.nextPractice}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
