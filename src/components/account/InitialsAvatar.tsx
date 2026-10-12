import { initials } from "@/lib/format";

/** Yellow circle with the player's initials (no photo yet); size and type scale come from `className`. */
export function InitialsAvatar({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={`rounded-full bg-volt text-ink font-display font-bold flex items-center justify-center flex-none ${className}`}>
      {initials(name)}
    </span>
  );
}
