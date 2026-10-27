import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { MountainMark } from "@/components/Logo";
import { getAdminUser } from "@/lib/auth";
import { accountHome, canOpenAdminPath, type StaffRole } from "@/lib/accountRules";
import { AdminSideNav } from "@/components/admin/shell/AdminSideNav";
import { AdminBottomNav } from "@/components/admin/shell/AdminBottomNav";
import { AdminAccountMenu } from "@/components/admin/shell/AdminAccountMenu";
import { Toaster } from "@/components/ui/Toast";
import { SignOutForm } from "@/components/admin/shell/SignOutForm";

export const metadata = { title: "Admin — Basecamp Padel", robots: { index: false } };
export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<StaffRole, string> = { admin: "Admin", coach: "Coach", scorekeeper: "Score Keeper" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminContent>{children}</AdminContent>
      <Toaster />
    </>
  );
}

async function AdminContent({ children }: { children: React.ReactNode }) {
  const { user, role } = await getAdminUser();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  // /admin/login renders without the shell
  if (!user) {
    if (pathname && !pathname.startsWith("/admin/login")) {
      redirect(`/admin/login?next=${encodeURIComponent(pathname)}`);
    }
    return <>{children}</>;
  }

  // User biasa (atau akun staf yang dinonaktifkan): dilarang masuk area admin sama sekali
  if (!role) {
    redirect("/");
  }

  // Coach hanya area coaching, score keeper hanya area live; /admin/users hanya admin
  const home = accountHome(role);
  if (pathname && !canOpenAdminPath(role, pathname)) {
    redirect(home);
  }

  // the side menu is narrow: role label under the name there, next to it in the phone header
  const brand = (stacked: boolean) => (
    <Link href={home} className="flex items-center gap-2.5 no-underline text-snow">
      <MountainMark size={28} />
      <div className="font-display font-bold text-base leading-none whitespace-nowrap">
        BASECAMP <span className="text-coral">PADEL</span>
        <span className={`font-sans font-medium text-xs text-snow/65 ${stacked ? "block mt-1" : "ml-2"}`}>{ROLE_LABEL[role]}</span>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-ink text-snow font-sans md:flex">
      <aside className="hidden md:flex flex-col flex-none w-60 sticky top-0 h-screen border-r border-snow/10">
        <div className="flex-none px-5 pt-5 pb-6">{brand(true)}</div>
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-4">
          <AdminSideNav role={role} />
        </div>
        <div className="flex-none border-t border-snow/10 px-5 py-4 flex flex-col gap-3 text-caption text-snow/65">
          <span className="truncate" title={user.email ?? ""}>{user.email}</span>
          <Link href="/" className="text-snow/80 no-underline hover:text-volt whitespace-nowrap">Lihat situs ↗</Link>
          <SignOutForm className="btn w-full min-h-10 px-4.5 py-2.5 tracking-button whitespace-nowrap" />
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <header className="md:hidden flex-none flex items-center justify-between gap-3 h-14 pl-4 pr-2 py-1.5 border-b border-snow/10">
          {brand(false)}
          <AdminAccountMenu email={user.email ?? ""} isAdmin={role === "admin"} />
        </header>
        <main className="flex-1 px-4 pt-5 pb-24 md:px-8 md:pt-8 md:pb-12 max-w-360 w-full box-border mx-auto">{children}</main>
      </div>
      <AdminBottomNav role={role} />
    </div>
  );
}
