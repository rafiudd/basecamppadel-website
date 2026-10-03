import Image from "next/image";
import Link from "next/link";
import type { RankedPlayer } from "@/lib/queries";

export function PlayerHeroCard({
  player,
  gender = "men",
}: {
  player: {
    id: string;
    rank: number;
    name: string;
    points: number;
    level?: string;
    region?: string | null;
    photo_url?: string | null;
  };
  gender?: "men" | "women";
}) {
  const isRank1 = player.rank === 1;
  const rank1Accent = gender === "men" ? "#FFD43B" : "#FF5A3C";
  const rankColor = isRank1 ? rank1Accent : "#FBF7F1";

  return (
    <Link
      href={`/leaderboard/${player.id}`}
      aria-label={`Detail ${player.name}`}
      className="group block relative w-full h-[224px] sm:h-[280px] mb-4 sm:mb-6 no-underline text-snow transition-transform hover:scale-[1.01]"
    >
      {/* Background card base */}
      <div
        className="absolute left-0 right-0 bottom-0 h-[164px] sm:h-[200px] bg-indigo rounded-2xl transition-all"
        style={{
          boxShadow: isRank1 ? `inset 0 0 0 2px ${rank1Accent}` : "none",
        }}
      />

      {/* Pill strip at bottom */}
      <div className="absolute left-3 right-3 sm:left-5 sm:right-5 top-[139px] sm:top-[176px] h-[46px] sm:h-[54px] box-border border border-snow/35 rounded-xl bg-ink/35 z-[1]" />

      {/* Giant rank number */}
      <div
        className="absolute left-4 sm:left-7 top-[122px] sm:top-[149px] z-[3] font-display font-bold text-[76px] sm:text-[104px] leading-none select-none pointer-events-none"
        style={{ color: rankColor }}
      >
        {player.rank}
      </div>

      {/* Player cutout photo */}
      <div className="absolute left-6 sm:left-[68px] bottom-0 w-[166px] sm:w-[224px] h-[224px] sm:h-[280px] z-[2] flex items-end justify-center rounded-b-2xl overflow-hidden pointer-events-none">
        <Image
          src={player.photo_url || "/images/player-placeholder.svg"}
          alt={`Foto ${player.name}`}
          width={224}
          height={276}
          unoptimized
          className="block w-full h-[220px] sm:h-[276px] object-contain object-bottom"
        />
      </div>

      {/* Player name */}
      <div className="absolute left-[196px] sm:left-[290px] right-3.5 sm:right-5 top-[104px] sm:top-[138px] z-[3] font-display font-bold text-lg sm:text-2xl leading-tight text-snow whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-volt transition-colors">
        {player.name}
      </div>

      {/* Info in bottom strip: level/region and points */}
      <div className="absolute left-[196px] sm:left-[290px] right-6 sm:right-[34px] top-[139px] sm:top-[176px] h-[46px] sm:h-[54px] z-[3] flex items-center justify-between gap-3 text-snow pointer-events-none">
        <span className="font-semibold text-xs sm:text-[13px] text-snow/75 tracking-[0.04em] uppercase truncate min-w-0">
          {player.region || player.level || "Basecamp"}
        </span>
        <span className="font-bold text-xs sm:text-sm whitespace-nowrap">
          Poin {player.points}
        </span>
      </div>
    </Link>
  );
}

export function PlayerCompactRow({
  player,
  isFirst = false,
}: {
  player: {
    id: string;
    rank: number;
    name: string;
    level?: string;
    points: number;
    wins?: number;
    losses?: number;
  };
  isFirst?: boolean;
}) {
  const initials = player.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <Link
      href={`/leaderboard/${player.id}`}
      className={`flex items-center gap-3 px-3.5 py-2.5 text-inherit no-underline hover:bg-ink/3 transition-colors ${
        !isFirst ? "border-t border-ink/8" : ""
      }`}
    >
      <div className="font-display font-bold text-base w-6 text-center text-indigo flex-none">
        {player.rank}
      </div>
      <div className="w-9 h-9 rounded-full flex-none bg-ink/7 text-ink flex items-center justify-center font-display font-bold text-[13px]">
        {initials || "BP"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-[15px] text-ink truncate">
          {player.name}
        </div>
        <div className="text-xs text-ink/65 truncate">{player.level || "Beginner"}</div>
      </div>
      <div className="text-[13px] text-ink/65 hidden sm:block">
        {player.wins ?? 0}–{player.losses ?? 0}
      </div>
      <div className="font-bold text-sm text-ink w-16 text-right whitespace-nowrap">
        Poin {player.points}
      </div>
    </Link>
  );
}

// Backward-compatible alias
export function RankRow({ player, accent }: { player: RankedPlayer; accent: string }) {
  const gender = accent === "#FF5A3C" ? "women" : "men";
  return <PlayerHeroCard player={player} gender={gender} />;
}
