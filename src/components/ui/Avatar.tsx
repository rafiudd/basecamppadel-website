/** "Rayhan / Andra" -> "RA", "Bob Hintama" -> "BH". */
function initials(name: string) {
  const parts = name.includes("/") ? name.split("/") : name.split(/\s+/);
  const letters = parts.map((s) => s.trim()[0] ?? "").join("");
  return (letters.length >= 2 ? letters : name.replace(/\s+/g, "")).slice(0, 2).toUpperCase();
}

/** Round avatar: the photo when there is one, else initials on indigo. */
export function Avatar({ name, photoUrl, size = 32 }: { name: string; photoUrl?: string | null; size?: number }) {
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- tiny avatar from Supabase Storage
    return <img src={photoUrl} alt="" style={{ width: size, height: size }} className="rounded-full object-cover object-top bg-indigo flex-none" />;
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size >= 36 ? 13 : size >= 32 ? 12 : 11 }}
      className="rounded-full bg-indigo text-snow font-display font-bold flex items-center justify-center flex-none"
    >
      {initials(name)}
    </span>
  );
}
