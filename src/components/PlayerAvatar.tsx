"use client";

import { useState } from "react";
import Image from "next/image";

export interface PlayerAvatarProps {
  src?: string | null;
  name: string;
  gender?: "men" | "women" | string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  showPadelBadge?: boolean;
  priority?: boolean;
}

const SIZE_CONFIGS = {
  xs: {
    container: "w-6 h-6 min-w-6",
    fontSize: "text-[10px]",
    badgeSize: "w-2.5 h-2.5 -bottom-0.5 -right-0.5",
    iconSize: 10,
    px: 24,
  },
  sm: {
    container: "w-8 h-8 min-w-8",
    fontSize: "text-xs",
    badgeSize: "w-3.5 h-3.5 -bottom-0.5 -right-0.5",
    iconSize: 14,
    px: 32,
  },
  md: {
    container: "w-9 h-9 min-w-9",
    fontSize: "text-[13px]",
    badgeSize: "w-3.5 h-3.5 -bottom-0.5 -right-0.5",
    iconSize: 16,
    px: 36,
  },
  lg: {
    container: "w-11 h-11 min-w-11",
    fontSize: "text-sm",
    badgeSize: "w-4 h-4 -bottom-1 -right-1",
    iconSize: 18,
    px: 44,
  },
  xl: {
    container: "w-16 h-16 min-w-16",
    fontSize: "text-xl",
    badgeSize: "w-5 h-5 -bottom-1 -right-1",
    iconSize: 24,
    px: 64,
  },
  "2xl": {
    container: "w-20 h-20 min-w-20",
    fontSize: "text-2xl",
    badgeSize: "w-6 h-6 -bottom-1.5 -right-1.5",
    iconSize: 28,
    px: 80,
  },
};

// Curated sporty gradients for deterministic player avatars
const SPORTY_PALETTES = [
  {
    bg: "from-[#1B1650] via-[#2A2278] to-[#120E38]",
    border: "border-volt/30",
    text: "text-snow",
    accent: "#FFD43B",
  },
  {
    bg: "from-[#FF5A3C] via-[#E04326] to-[#99220E]",
    border: "border-volt/40",
    text: "text-snow",
    accent: "#FFD43B",
  },
  {
    bg: "from-[#0F3942] via-[#1B5E6B] to-[#0A262C]",
    border: "border-volt/35",
    text: "text-snow",
    accent: "#4DEEEA",
  },
  {
    bg: "from-[#38164D] via-[#5C237F] to-[#240D33]",
    border: "border-coral/40",
    text: "text-snow",
    accent: "#FF5A3C",
  },
  {
    bg: "from-[#2B2735] via-[#3C364A] to-[#17151F]",
    border: "border-volt/30",
    text: "text-snow",
    accent: "#FFD43B",
  },
];

function getPalette(name: string, gender?: string) {
  if (gender === "women") {
    return {
      bg: "from-[#FF5A3C] via-[#CE371D] to-[#2D1124]",
      border: "border-volt/40",
      text: "text-snow",
      accent: "#FFD43B",
    };
  }
  if (gender === "men") {
    return {
      bg: "from-[#1B1650] via-[#282075] to-[#0E0A2C]",
      border: "border-volt/35",
      text: "text-snow",
      accent: "#FFD43B",
    };
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % SPORTY_PALETTES.length;
  return SPORTY_PALETTES[idx];
}

function getInitials(name: string): string {
  if (!name) return "BP";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Padel Racket Mini SVG Icon
 */
function PadelRacketIcon({ size = 14, color = "#FFD43B" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="inline-block flex-none"
    >
      <circle cx="12" cy="9" r="7" stroke={color} strokeWidth="1.8" fill="rgba(27,22,80,0.6)" />
      <circle cx="10" cy="7.5" r="0.75" fill={color} />
      <circle cx="12" cy="7.5" r="0.75" fill={color} />
      <circle cx="14" cy="7.5" r="0.75" fill={color} />
      <circle cx="9" cy="9.5" r="0.75" fill={color} />
      <circle cx="11" cy="9.5" r="0.75" fill={color} />
      <circle cx="13" cy="9.5" r="0.75" fill={color} />
      <circle cx="15" cy="9.5" r="0.75" fill={color} />
      <circle cx="11" cy="11.5" r="0.75" fill={color} />
      <circle cx="13" cy="11.5" r="0.75" fill={color} />
      <path d="M10 16L9.5 18H14.5L14 16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="11" y="18" width="2" height="4.5" rx="0.5" fill={color} />
    </svg>
  );
}

export function PlayerAvatar({
  src,
  name,
  gender,
  size = "md",
  className = "",
  showPadelBadge = false,
  priority = false,
}: PlayerAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const cfg = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;
  const initials = getInitials(name);
  const palette = getPalette(name, gender);

  const hasPhoto = !!src && !hasError;

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full select-none ${cfg.container} ${className}`}
    >
      {hasPhoto ? (
        <div className="w-full h-full rounded-full overflow-hidden border border-ink/10 shadow-xs bg-indigo/5">
          <Image
            src={src!}
            alt={`Avatar ${name}`}
            width={cfg.px}
            height={cfg.px}
            priority={priority}
            unoptimized
            onError={() => setHasError(true)}
            className="w-full h-full object-cover object-top"
          />
        </div>
      ) : (
        <div
          className={`w-full h-full rounded-full bg-gradient-to-br ${palette.bg} ${palette.text} ${palette.border} border shadow-xs flex items-center justify-center relative overflow-hidden`}
        >
          {/* Subtle Sporty Court Lines Accent in Background */}
          <svg
            className="absolute inset-0 w-full h-full opacity-15 pointer-events-none"
            viewBox="0 0 40 40"
            fill="none"
          >
            <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="20" y1="2" x2="20" y2="38" stroke="currentColor" strokeWidth="0.8" />
            <line x1="2" y1="20" x2="38" y2="20" stroke="currentColor" strokeWidth="0.8" />
          </svg>

          {/* Player Initials in Space Grotesk Bold */}
          <span
            className={`font-display font-bold ${cfg.fontSize} tracking-wider relative z-[1] drop-shadow-xs`}
          >
            {initials}
          </span>
        </div>
      )}

      {/* Mini Padel Badge */}
      {showPadelBadge && (
        <div
          className={`absolute ${cfg.badgeSize} rounded-full bg-indigo border border-snow/30 flex items-center justify-center shadow-xs z-[2]`}
          title="Padel Player"
        >
          <PadelRacketIcon size={cfg.iconSize * 0.75} color={palette.accent} />
        </div>
      )}
    </div>
  );
}
