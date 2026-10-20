interface Props {
  name: string;
  className?: string;
  size?: "card" | "hero";
}

/**
 * Renders the retro-sport high-contrast visual block seen in the Liga design
 * with checkered borders, graphic tennis accents, and impactful typography.
 */
export function LigaPoster({ name, className = "", size = "card" }: Props) {
  // Extract words for styling (e.g. "EAST", "LEAGUE", "PADEL")
  const safeName = (name || "").trim();
  const words = safeName.split(/\s+/);
  const w1 = words[0] || "EAST";
  const w2 = words[1] || "LEAGUE";
  const w3 = words.slice(2).join(" ") || "PADEL";

  const isHero = size === "hero";

  return (
    <div
      className={`relative overflow-hidden bg-[#1F4A2C] flex items-center justify-center select-none ${className}`}
    >
      {/* Checkered top stripe */}
      <div
        aria-hidden="true"
        className="absolute left-0 right-0 top-0 h-3.5"
        style={{
          backgroundImage: "repeating-conic-gradient(#1F4A2C 0% 25%, #FFFFFF 0% 50%)",
          backgroundSize: "14px 14px",
        }}
      />

      {/* Decorative tennis circles */}
      <div
        aria-hidden="true"
        className={`absolute rounded-full bg-[#F2E27A] border-4 border-white ${
          isHero
            ? "-right-10 -top-10 sm:-right-14 sm:-top-14 md:-right-16 md:-top-20 w-32 h-32 sm:w-40 sm:h-40 md:w-56 md:h-56 opacity-95"
            : "-right-8 -bottom-8 sm:-right-12 sm:-bottom-12 w-24 h-24 sm:w-36 sm:h-36"
        }`}
      />
      <div
        aria-hidden="true"
        className={`absolute rounded-full bg-[#F2E27A] border-4 border-white ${
          isHero
            ? "-left-10 -bottom-10 sm:-left-12 sm:-bottom-12 md:-left-16 md:-bottom-16 w-28 h-28 sm:w-32 sm:h-32 md:w-48 md:h-48 opacity-95"
            : "-left-6 top-8 sm:-left-9 sm:top-10 w-16 h-16 sm:w-22 sm:h-22"
        }`}
      />

      {/* Dynamic diagonal shine on hero */}
      {isHero && (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(115deg, transparent 0 62%, rgba(255,255,255,0.07) 62% 66%, transparent 66%)",
          }}
        />
      )}

      {/* High-impact typography */}
      <div
        aria-label="East Padel League"
        role="img"
        className="relative flex flex-col items-start leading-[0.88] z-10"
      >
        <span
          className={`font-display font-black text-white tracking-tight uppercase ${
            isHero ? "text-7xl md:text-[96px]" : "text-5xl md:text-[67px]"
          }`}
          style={{ fontFamily: "'Archivo Black', var(--font-space-grotesk), Impact, sans-serif" }}
        >
          EAST
        </span>
        <span
          className={`font-display font-black text-[#F2E27A] -rotate-6 tracking-wide uppercase ${
            isHero
              ? "text-3xl md:text-[45px] -my-1.5 ml-8 md:ml-10"
              : "text-2xl md:text-[31px] -my-1 ml-6 md:ml-7"
          }`}
          style={{
            fontFamily: "'Archivo Black', var(--font-space-grotesk), Impact, sans-serif",
            WebkitTextStroke: "2px #163821",
          }}
        >
          LEAGUE
        </span>
        <span
          className={`font-display font-black text-white tracking-tight uppercase ${
            isHero ? "text-7xl md:text-[96px]" : "text-5xl md:text-[67px]"
          }`}
          style={{ fontFamily: "'Archivo Black', var(--font-space-grotesk), Impact, sans-serif" }}
        >
          PADEL
        </span>
      </div>
    </div>
  );
}
