"use client";

import Link from "next/link";
import { TrophyIcon } from "@/components/ui/icons";
import type { LeagueStandingRow, LeagueWithVolumes } from "@/lib/leagues";
import { formatDateShortIndo } from "@/lib/format";

interface Props {
  league: LeagueWithVolumes;
  standings: LeagueStandingRow[];
}

export function AdminLigaDetailView({ league, standings }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin/liga" className="text-sm text-snow/70 no-underline hover:text-volt">
        ← Liga
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-13 h-13 rounded-xl bg-indigo text-volt flex items-center justify-center flex-none">
            <TrophyIcon className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-2xl md:text-page m-0 leading-tight truncate">
              {league.name}
            </h1>
            <div className="text-caption text-snow/70 mt-1 truncate">
              {league.organizer ? `${league.organizer} · ` : ""}preset {league.preset_name ?? "East League"}
            </div>
          </div>
        </div>

        <Link
          href={`/admin/liga/${league.id}/edit`}
          aria-label="Edit liga"
          title="Edit liga"
          className="btn min-h-11 px-3.5 flex items-center justify-center no-underline flex-none text-snow/80 hover:text-snow"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </Link>
      </div>

      {/* Volume Section */}
      <section className="bg-ink-3 rounded-card p-4 md:p-6 flex flex-col border border-snow/5">
        <div className="text-2xs font-bold tracking-caps text-snow/70 pb-3">VOLUME</div>

        <div className="flex flex-col divide-y divide-snow/8">
          {league.volumes.map((vol) => {
            const hasEvent = !!vol.event_id && !!vol.event;
            const event = vol.event;
            const isLive = event?.status === "active";
            const isFinished = event?.status === "finished";

            return (
              <div
                key={vol.id}
                className="py-3.5 flex flex-col md:grid md:grid-cols-[140px_minmax(0,1fr)_130px_150px] gap-3 md:gap-4 items-start md:items-center"
              >
                {/* Volume badge */}
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-title-sm text-snow">
                    Vol. {vol.volume_number}
                  </span>
                  {vol.is_final && (
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-volt/16 text-volt">
                      Final
                    </span>
                  )}
                </div>

                {/* Event info */}
                <div className="min-w-0">
                  {hasEvent ? (
                    <>
                      <div className="font-semibold text-sm text-snow truncate">{event?.title}</div>
                      <div className="text-caption text-snow/70 mt-0.5">
                        {event?.event_date ? formatDateShortIndo(event.event_date) : "Jadwal belum ditentukan"} · {event?.num_teams ?? 0} tim
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold text-sm text-snow/80">Belum ada event</div>
                      <div className="text-caption text-snow/50 mt-0.5">
                        {vol.approx_date || `Slot Volume ${vol.volume_number}`}
                      </div>
                    </>
                  )}
                </div>

                {/* Status Badge */}
                <div>
                  {hasEvent ? (
                    isLive ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold bg-coral/18 text-coral-soft">
                        <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />
                        Berjalan
                      </span>
                    ) : isFinished ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold bg-win/18 text-win-soft">
                        Selesai
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold bg-snow/10 text-snow/80">
                        Pendaftaran
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold bg-snow/10 text-snow/60">
                      Belum dibuat
                    </span>
                  )}
                </div>

                {/* Action button */}
                <div className="w-full md:w-auto flex md:justify-end">
                  {hasEvent ? (
                    <Link
                      href={`/admin/events/${vol.event_id}`}
                      className="btn min-h-10 px-4 inline-flex items-center justify-center no-underline text-xs w-full md:w-auto"
                    >
                      Buka event
                    </Link>
                  ) : (
                    <Link
                      href={`/admin/events/new?league_id=${league.id}&volume_id=${vol.id}&volume_num=${vol.volume_number}&title=${encodeURIComponent(`${league.name} Vol. ${vol.volume_number}`)}&preset_id=${league.point_preset_id ?? ""}`}
                      className="btn btn-volt text-indigo font-bold min-h-10 px-4 inline-flex items-center justify-center no-underline text-xs w-full md:w-auto"
                    >
                      + Buat event
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Standings Section */}
      <section className="bg-ink-3 rounded-card p-4 md:p-6 flex flex-col border border-snow/5 overflow-hidden">
        <div className="flex items-baseline justify-between gap-3 pb-3 flex-wrap">
          <div className="text-2xs font-bold tracking-caps text-snow/70">KLASEMEN LIGA</div>
          <div className="text-xs text-snow/60">Otomatis dari hasil tiap volume</div>
        </div>

        {standings.length === 0 ? (
          <div className="py-8 text-center text-sm text-snow/60 flex flex-col items-center gap-2">
            <div>Belum ada poin klasemen.</div>
            <div className="text-xs text-snow/40 max-w-sm">
              Poin klasemen akan otomatis terkalkulasi saat event volume mulai berjalan atau selesai.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
            <table className="w-full text-left border-collapse text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-snow/10 text-2xs uppercase tracking-caps text-snow/60">
                  <th className="py-2.5 pr-3 font-semibold w-10">#</th>
                  <th className="py-2.5 pr-3 font-semibold">Pemain</th>
                  {league.volumes.map((v) => (
                    <th key={v.id} className="py-2.5 px-3 font-semibold text-center w-16">
                      V{v.volume_number}
                    </th>
                  ))}
                  <th className="py-2.5 pl-3 font-semibold text-right w-20">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-snow/8">
                {standings.map((row) => (
                  <tr key={row.playerId} className="hover:bg-snow/4 transition-colors">
                    <td className="py-3 pr-3 font-display font-bold text-snow/70">
                      {row.rank}
                    </td>
                    <td className="py-3 pr-3 font-semibold text-snow">
                      {row.playerName}
                    </td>
                    {league.volumes.map((v) => {
                      const score = row.volumeScores[v.volume_number];
                      if (!score) {
                        return (
                          <td key={v.id} className="py-3 px-3 text-center text-snow/35 font-mono">
                            –
                          </td>
                        );
                      }
                      return (
                        <td key={v.id} className="py-3 px-3 text-center font-medium text-snow">
                          {score.points}
                          {score.isProvisional && <span className="text-coral ml-0.5">*</span>}
                        </td>
                      );
                    })}
                    <td className="py-3 pl-3 text-right font-display font-bold text-title-sm text-snow">
                      {row.totalPoints}
                      {row.hasProvisional && <span className="text-coral ml-0.5 font-sans text-xs">*</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="text-xs text-snow/60 leading-relaxed">
        Salah poin? Benerin hasil match di event volumenya, klasemen liga ikut ke-update.
      </div>
    </div>
  );
}
