import Link from "next/link";
import { MountainMark } from "@/components/Logo";
import { getAdminUser } from "@/lib/auth";
import { AdminNavLinks } from "@/components/admin/AdminNavLinks";
import { AdminBottomNav } from "@/components/admin/AdminBottomNav";

export const metadata = { title: "Admin — Basecamp Padel", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = await getAdminUser();

  // /admin/login renders without the shell (proxy.ts already redirects anon users elsewhere)
  if (!user) return <>{children}</>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-ink text-snow font-sans flex items-center justify-center p-6">
        <div className="max-w-[440px] bg-indigo rounded-2xl p-8 flex flex-col gap-4">
          <div className="font-display font-bold text-xl">Akun belum jadi admin</div>
          <p className="text-sm text-snow/70">
            Kamu login sebagai <b>{user.email}</b>, tapi akun ini belum ada di tabel <code>admin_users</code>.
            Jalankan di SQL editor Supabase:
          </p>
          <pre className="text-xs bg-ink rounded-lg p-3 overflow-x-auto">{`insert into public.admin_users (user_id)\nselect id from auth.users where email = '${user.email}';`}</pre>
          <form action="/auth/signout" method="post">
            <button className="btn">Keluar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink text-snow font-sans flex flex-col">
      <header className="flex items-center justify-between gap-x-4 gap-y-2 px-4 md:px-6 py-3 border-b border-snow/10 flex-wrap">
        <Link href="/admin" className="flex items-center gap-3 no-underline text-snow">
          <MountainMark size={28} />
          <div className="font-display font-bold text-base leading-none">
            BASECAMP <span className="text-coral">PADEL</span>
            <span className="font-sans font-medium text-xs text-snow/50 ml-2">Admin</span>
          </div>
        </Link>
        <div className="hidden md:block">
          <AdminNavLinks />
        </div>
        <div className="flex items-center gap-3 text-xs text-snow/50">
          <span className="hidden md:inline">{user.email}</span>
          <Link href="/" className="text-snow/70 no-underline hover:text-volt">Lihat situs ↗</Link>
          <form action="/auth/signout" method="post">
            <button className="btn px-3 py-1.5 text-xs">Keluar</button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-6 pb-24 md:p-8 max-w-[1100px] w-full mx-auto">{children}</main>
      <AdminBottomNav />
    </div>
  );
}
