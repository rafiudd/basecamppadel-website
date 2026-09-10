export function MountainMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="flex-none">
      <circle cx="24" cy="13" r="5" fill="#FFD43B" />
      <polygon points="25,13 16,30 34,30" fill="#FBF7F1" />
      <polygon points="17,14 7,30 27,30" fill="#FF5A3C" />
    </svg>
  );
}
