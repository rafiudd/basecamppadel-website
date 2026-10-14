import { initials } from "@/lib/format";

/**
 * Round profile avatar: the photo when there is one (Supabase Storage, or a Google picture, which is
 * loaded without a referrer), else the initials on yellow. Size, border and type scale via `className`.
 */
export function ProfileAvatar({ name, photoUrl, className = "" }: { name: string; photoUrl?: string | null; className?: string }) {
  const base = `rounded-full flex-none ${className}`;
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- small avatar from storage or Google
    return <img src={photoUrl} alt="" referrerPolicy="no-referrer" className={`${base} object-cover bg-volt`} />;
  }
  return (
    <span aria-hidden className={`${base} bg-volt text-ink font-display font-bold flex items-center justify-center`}>
      {initials(name)}
    </span>
  );
}
