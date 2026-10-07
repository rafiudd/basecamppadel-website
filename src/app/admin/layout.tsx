import Link from "next/link";
import { MountainMark } from "@/components/Logo";
import { getAdminUser } from "@/lib/auth";
import { AdminNavLinks } from "@/components/admin/shell/AdminNavLinks";
import { AdminBottomNav } from "@/components/admin/shell/AdminBottomNav";
import { AdminAccountMenu } from "@/components/admin/shell/AdminAccountMenu";
import { Toaster } from "@/components/ui/Toast";
import { SignOutForm } from "@/components/admin/shell/SignOutForm";

export const metadata = { title: "Admin — Basecamp Padel", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminContent>{children}</AdminContent>
      <Toaster />
    </>
  );
}

async function AdminContent({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = await getAdminUser();

  // /admin/login renders without the shell (proxy.ts already redirects anon users elsewhere)
  if (!user) return <>{children}</>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-ink text-snow font-sans flex items-center justify-center p-6">
        <div className="max-w-110 bg-indigo rounded-2xl p-8 flex flex-col gap-4">
          <div className="font-display font-bold text-xl">Akun belum jadi admin</div>
          <p className="text-sm text-snow/70">
            Kamu login sebagai <b>{user.email}</b>, tapi akun ini belum ada di tabel <code>admin_users</code>.
            Jalankan di SQL editor Supabase:
          </p>
          <pre className="text-xs bg-ink rounded-lg p-3 overflow-x-auto">{`insert into public.admin_users (user_id)\nselect id from auth.users where email = '${user.email}';`}</pre>
          <SignOutForm className="btn" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink text-snow font-sans flex flex-col">
      <header className="flex-none flex items-center justify-between gap-3 md:gap-4 h-14 md:h-auto pl-4 pr-2 py-1.5 md:px-6 md:py-3 border-b border-snow/10">
        <Link href="/admin/events" className="flex items-center gap-2.5 no-underline text-snow">
          <MountainMark size={28} />
          <div className="font-display font-bold text-base leading-none whitespace-nowrap">
            BASECAMP <span className="text-coral">PADEL</span>
            <span className="font-sans font-medium text-xs text-snow/65 ml-2">Admin</span>
          </div>
        </Link>
        <div className="hidden md:block min-w-0">
          <AdminNavLinks />
        </div>
        <div className="hidden md:flex items-center gap-3 text-caption text-snow/65">
          <span className="hidden lg:inline">{user.email}</span>
          <Link href="/" className="text-snow/80 no-underline hover:text-volt whitespace-nowrap">Lihat situs ↗</Link>
          <SignOutForm className="btn min-h-10 px-4.5 py-2.5 tracking-button whitespace-nowrap" />
        </div>
        <div className="md:hidden">
          <AdminAccountMenu email={user.email ?? ""} />
        </div>
      </header>
      <main className="flex-1 px-4 pt-5 pb-24 md:px-8 md:pt-8 md:pb-12 max-w-360 w-full box-border mx-auto">{children}</main>
      <AdminBottomNav />
    </div>
  );
}
