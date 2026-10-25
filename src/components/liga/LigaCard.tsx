import Link from "next/link";
import { LigaPoster } from "./LigaPoster";
import type { LeagueWithVolumes } from "@/lib/leagues";
import { formatDateShortIndo } from "@/lib/format";
import { WHATSAPP_URL } from "@/lib/config";

interface Props {
  league: LeagueWithVolumes;
}

export function LigaCard({ league }: Props) {
  // Find current active / next volume
  const liveVol = league.volumes.find((v) => v.event?.status === "active");
  const openVol = league.volumes.find((v) => v.event?.status === "draft" && v.event_id);
  const currentVol = liveVol ?? openVol ?? league.volumes[0];

  let statusBadge = null;
  if (liveVol) {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold bg-coral/14 text-coral-soft">
        <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />
        Vol. {liveVol.volume_number} berlangsung
      </span>
    );
  } else if (openVol) {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold bg-coral/14 text-coral-soft">
        <span className="w-1.5 h-1.5 rounded-full bg-coral" />
        Pendaftaran Vol. {openVol.volume_number} dibuka
      </span>
    );
  }

  const primaryActionUrl = liveVol?.event?.slug
    ? `/jadwal/${liveVol.event.slug}`
    : openVol
    ? openVol.event?.whatsapp_url || WHATSAPP_URL
    : `/liga/${league.slug}`;

  const primaryActionLabel = liveVol
    ? `Lihat Vol. ${liveVol.volume_number} Live`
    : openVol
    ? `Daftar Vol. ${openVol.volume_number}`
    : "Lihat Liga";

  const showSecondaryAction = primaryActionUrl !== `/liga/${league.slug}`;

  return (
    <article className="bg-white border border-ink/8 rounded-2xl overflow-hidden flex flex-col md:flex-row min-h-[340px] shadow-xs hover:shadow-md transition-shadow">
      {/* Left poster */}
      <LigaPoster
        name={league.name}
        className="w-full md:w-[380px] h-52 md:h-auto flex-none"
      />

      {/* Right details */}
      <div className="flex-1 min-w-0 p-6 md:p-8 flex flex-col gap-3.5">
        <div className="flex gap-2 flex-wrap items-center">
          <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-[#1F4A2C]/12 text-[#1F4A2C]">
            Liga · {league.total_volumes} volume
          </span>
          {statusBadge}
        </div>

        <div>
          <Link href={`/liga/${league.slug}`} className="no-underline text-ink hover:text-coral transition-colors">
            <h3 className="font-display font-bold text-2xl md:text-3xl m-0 leading-tight">
              {league.name}
            </h3>
          </Link>
          {league.organizer && (
            <div className="text-sm font-semibold text-ink/65 mt-1">
              by {league.organizer}
            </div>
          )}
        </div>

        {league.description && (
          <p className="m-0 text-sm md:text-input text-ink/80 leading-relaxed">
            {league.description}
          </p>
        )}

        {/* Volume chips */}
        <div className="flex gap-2 flex-wrap pt-1">
          {league.volumes.map((v) => {
            const isCurrent = v.id === currentVol?.id;
            let dateText = v.approx_date || "Tanggal menyusul";
            if (v.event?.event_date) {
              dateText = formatDateShortIndo(v.event.event_date);
            }

            return (
              <span
                key={v.id}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isCurrent
                    ? "bg-indigo text-snow"
                    : "bg-ink/6 text-ink hover:bg-ink/10"
                }`}
              >
                Vol. {v.volume_number}{v.is_final ? " · Final" : ""} · {dateText}
              </span>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-auto pt-4 flex-wrap">
          {primaryActionUrl.startsWith("/") ? (
            <Link
              href={primaryActionUrl}
              className="btn btn-coral text-ink font-bold text-sm px-6 py-3 rounded-full no-underline text-center"
            >
              {primaryActionLabel}
            </Link>
          ) : (
            <a
              href={primaryActionUrl}
              target="_blank"
              rel="noopener"
              className="btn btn-coral text-ink font-bold text-sm px-6 py-3 rounded-full no-underline text-center"
            >
              {primaryActionLabel}
            </a>
          )}

          {showSecondaryAction && (
            <Link
              href={`/liga/${league.slug}`}
              className="border-1.5 border-ink/25 hover:border-ink text-ink font-bold text-sm px-6 py-2.5 rounded-full no-underline text-center transition-colors"
            >
              Lihat liga →
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
