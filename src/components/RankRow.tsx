import Image from "next/image";
import Link from "next/link";
import type { RankedPlayer } from "@/lib/queries";

export function RankRow({ player, accent }: { player: RankedPlayer; accent: string }) {
  const top3 = player.rank <= 3;
  return (
    <Link
      href={`/leaderboard/${player.id}`}
      className="relative block w-full h-[270px] mb-6 no-underline text-snow"
      aria-label={`${player.name}, peringkat ${player.rank}, ${player.points} poin`}
    >
      {/* card */}
      <div
        className="absolute left-0 right-0 bottom-0 h-[170px] rounded-[18px]"
        style={{
          background: top3 ? `linear-gradient(90deg, ${accent}2a, ${accent}08)` : "#221f30",
        }}
      />
      {/* big rank number */}
      <div
        className="absolute left-5 bottom-2 z-[1] font-display font-bold text-[96px] leading-none"
        style={{ color: top3 ? accent : "rgba(251,247,241,0.18)" }}
      >
        {player.rank}
      </div>
      {/* bleeding cutout photo */}
      <div className="absolute left-4 sm:left-9 bottom-0 w-[150px] sm:w-[200px] h-[270px] z-[2] pointer-events-none">
        <Image
          src={player.photo_url || "/images/player-placeholder.svg"}
          alt=""
          fill
          sizes="200px"
          unoptimized={!player.photo_url}
          className="object-cover object-bottom"
        />
      </div>
      {/* info box */}
      <div className="absolute left-[170px] sm:left-[250px] right-3 sm:right-4 bottom-6 z-[3] flex flex-col gap-2.5 border border-snow/25 rounded-[10px] px-4 py-3 bg-ink/82">
        <div className="font-display font-bold text-[18px] sm:text-[20px] truncate">{player.name}</div>
        <div className="h-px bg-snow/20 w-full" />
        <div className="flex items-center justify-between gap-4">
          <div className="font-sans font-semibold text-[13px] text-snow/60 uppercase tracking-[0.04em] truncate">
            {player.region}
          </div>
          <div className="font-sans font-bold text-sm whitespace-nowrap">Poin {player.points}</div>
        </div>
      </div>
    </Link>
  );
}
