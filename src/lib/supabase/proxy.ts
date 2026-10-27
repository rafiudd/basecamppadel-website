import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/server/session";
import { accountHome, canOpenAdminPath, staffRole, type StaffRole } from "@/lib/accountRules";
import { getDb } from "@/lib/mongodb";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const path = request.nextUrl.pathname;
  request.headers.set("x-pathname", path);
  response = NextResponse.next({ request });

  const sessionToken = request.cookies.get("basecamp_session")?.value;
  const user = sessionToken ? await verifySessionToken(sessionToken) : null;

  const isAdminArea = path.startsWith("/admin") && !path.startsWith("/admin/login");
  const isAdminLogin = path.startsWith("/admin/login");

  // Always verify the current staff role from DB on admin routes so revocation / deactivation takes effect immediately
  let liveRole: StaffRole | null = null;
  if (user && (isAdminArea || isAdminLogin)) {
    try {
      const db = await getDb();
      const adminRow = await db.collection("admin_users").findOne({
        $or: [{ _id: user.id }, { user_id: user.id }],
      } as any);
      liveRole = staffRole(adminRow);
    } catch {
      liveRole = staffRole({ role: user.role });
    }
  }

  if (isAdminArea) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }

    if (!liveRole) {
      // User biasa atau akses admin sudah dicabut: dilarang mengakses halaman admin
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // coach only the coaching area, score keeper only Live, /admin/users admin only
    if (!canOpenAdminPath(liveRole, path)) {
      const url = request.nextUrl.clone();
      url.pathname = accountHome(liveRole);
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // player account pages: sign in first, then come back here
  if (path.startsWith("/akun") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/masuk";
    url.search = "";
    url.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (isAdminLogin && user) {
    if (liveRole) {
      const url = request.nextUrl.clone();
      url.pathname = accountHome(liveRole);
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
