"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { CoachingHistoryList } from "@/components/admin/CoachingHistoryList";
import { initials, winRate } from "@/lib/format";
import { LEVEL_DEFINITIONS, type PlayerLevelName } from "@/lib/coaching";
import { getPlayerCoachingProfile, type PlayerCoachingProfile } from "@/app/admin/coaching/player-profile-actions";
import type { Player } from "@/lib/database.types";

/** Full player profile in a popup — stats already in hand from the players list (no fetch), plus
 *  coaching session count + note history fetched on open. Easier to scan than the plain table row. */
export function PlayerProfileModal({ player, onClose }: { player: Player; onClose: () => void }) {
  const [coaching, setCoaching] = useState<PlayerCoachingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPlayerCoachingProfile(player.id)
      .then((res) => {
        if (cancelled) return;
        if (!res) setError(true);
        else setCoaching(res);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [player.id]);

  const totalMatches = player.wins + player.losses;
  const rate = winRate(player.wins, player.losses);

  return (
    <Modal title="Profil pemain" onClose={onClose} width={560}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3.5">
          {player.photo_url ? (
            <Avatar name={player.name} photoUrl={player.photo_url} size={48} />
          ) : (
            <span
              aria-hidden="true"
              className="w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-base flex-none"
              style={{
                backgroundColor: LEVEL_DEFINITIONS[player.level as PlayerLevelName]?.color || "#FFD43B",
                color: LEVEL_DEFINITIONS[player.level as PlayerLevelName]?.textColor || "#17151F",
              }}
            >
              {initials(player.name)}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-xl">{player.name}</div>
            <div className="text-sm text-snow/65">
              {player.gender === "F" ? "Women" : "Men"} · {player.level || "Beginner"} · {player.region || "Purwokerto"}
              {!player.active && <span className="ml-2 text-loss font-semibold">· Nonaktif</span>}
            </div>
          </div>
          {coaching && (
            <span className="flex-none rounded-full bg-volt/14 text-volt px-3 py-1.5 text-xs font-bold whitespace-nowrap">
              Sudah coaching {coaching.sessionCount}×
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          <div className="bg-ink rounded-xl p-3 text-center">
            <div className="font-display font-bold text-xl">{player.points}</div>
            <div className="text-2xs text-snow/60 uppercase tracking-wider">Poin</div>
          </div>
          <div className="bg-ink rounded-xl p-3 text-center">
            <div className="font-display font-bold text-xl">{player.wins}</div>
            <div className="text-2xs text-snow/60 uppercase tracking-wider">Menang</div>
          </div>
          <div className="bg-ink rounded-xl p-3 text-center">
            <div className="font-display font-bold text-xl">{player.losses}</div>
            <div className="text-2xs text-snow/60 uppercase tracking-wider">Kalah</div>
          </div>
          <div className="bg-ink rounded-xl p-3 text-center">
            <div className="font-display font-bold text-xl">{totalMatches > 0 ? `${rate}%` : "—"}</div>
            <div className="text-2xs text-snow/60 uppercase tracking-wider">Win rate</div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="text-xs font-bold tracking-caps text-snow/60">CATATAN COACHING</div>
          {loading && <div className="text-sm text-snow/50">Memuat…</div>}
          {!loading && error && <div className="text-sm text-loss">Gagal memuat catatan coaching.</div>}
          {!loading && coaching && <CoachingHistoryList history={coaching.history} />}
        </div>
      </div>
    </Modal>
  );
}
