"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { CoachingHistoryList } from "@/components/admin/CoachingHistoryList";
import { initials } from "@/lib/format";
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
            <CoachingHistoryList history={data.history} />
          </div>
        </div>
      )}
    </Modal>
  );
}
