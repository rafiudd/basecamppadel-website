import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
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
  const { user, isAdmin, isCoach, isScoreKeeper } = await getAdminUser();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  // /admin/login renders without the shell
  if (!user) {
    if (pathname && !pathname.startsWith("/admin/login")) {
      redirect(`/admin/login?next=${encodeURIComponent(pathname)}`);
    }
    return <>{children}</>;
  }

  // User biasa: dilarang masuk area admin sama sekali
  if (!isAdmin && !isCoach && !isScoreKeeper) {
    redirect("/");
  }

  const isCoachOnly = !isAdmin && isCoach;
  const isScoreKeeperOnly = !isAdmin && isScoreKeeper;

  // Coach hanya boleh mengakses area coaching & kelas
  if (isCoachOnly && pathname && !pathname.startsWith("/admin/coaching") && !pathname.startsWith("/admin/kelas")) {
    redirect("/admin/coaching");
  }

  // Score keeper hanya boleh mengakses area live
  if (isScoreKeeperOnly && pathname && !pathname.startsWith("/admin/live")) {
    redirect("/admin/live");
  }

  // User management pages are strictly for admin
  if (!isAdmin && pathname && pathname.startsWith("/admin/users")) {
    redirect(isCoachOnly ? "/admin/coaching" : isScoreKeeperOnly ? "/admin/live" : "/admin/events");
  }

  const roleLabel = isCoachOnly ? "Coach" : isScoreKeeperOnly ? "Score Keeper" : "Admin";
  const homeHref = isCoachOnly ? "/admin/coaching" : isScoreKeeperOnly ? "/admin/live" : "/admin/events";

  return (
    <div className="min-h-screen bg-ink text-snow font-sans flex flex-col">
      <header className="flex-none flex items-center justify-between gap-3 md:gap-4 h-14 md:h-auto pl-4 pr-2 py-1.5 md:px-6 md:py-3 border-b border-snow/10">
        <Link href={homeHref} className="flex items-center gap-2.5 no-underline text-snow">
          <MountainMark size={28} />
          <div className="font-display font-bold text-base leading-none whitespace-nowrap">
            BASECAMP <span className="text-coral">PADEL</span>
            <span className="font-sans font-medium text-xs text-snow/65 ml-2">{roleLabel}</span>
          </div>
        </Link>
        <div className="hidden md:block min-w-0">
          <AdminNavLinks isCoachOnly={isCoachOnly} isScoreKeeperOnly={isScoreKeeperOnly} isAdmin={isAdmin} />
        </div>
        <div className="hidden md:flex items-center gap-3 text-caption text-snow/65">
          <span className="hidden lg:inline">{user.email}</span>
          <Link href="/" className="text-snow/80 no-underline hover:text-volt whitespace-nowrap">Lihat situs ↗</Link>
          <SignOutForm className="btn min-h-10 px-4.5 py-2.5 tracking-button whitespace-nowrap" />
        </div>
        <div className="md:hidden">
          <AdminAccountMenu email={user.email ?? ""} isAdmin={isAdmin} />
        </div>
      </header>
      <main className="flex-1 px-4 pt-5 pb-24 md:px-8 md:pt-8 md:pb-12 max-w-360 w-full box-border mx-auto">{children}</main>
      <AdminBottomNav isCoachOnly={isCoachOnly} isScoreKeeperOnly={isScoreKeeperOnly} isAdmin={isAdmin} />
    </div>
  );
}
