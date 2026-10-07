/** Small inline loading ring (styles: `.spinner` in globals.css); sized by font size, colored by text color. */
export function Spinner({ className = "text-volt", label = "Menyimpan" }: { className?: string; label?: string | null }) {
  return label ? <span role="status" aria-label={label} className={`spinner ${className}`} /> : <span aria-hidden className={`spinner ${className}`} />;
}
