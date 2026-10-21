import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/server/session";
import { accountHome } from "@/lib/accountRules";
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

  // Always verify current admin/coach role from DB on admin routes so role revocation takes effect immediately
  let liveRole: string | null = null;
  if (user && (isAdminArea || isAdminLogin)) {
    try {
      const db = await getDb();
      const adminRow = await db.collection("admin_users").findOne({
        $or: [{ _id: user.id }, { user_id: user.id }],
      } as any);
      liveRole = (adminRow?.role as string | undefined) || null;
    } catch {
      liveRole = user.role || null;
    }
  }

  if (isAdminArea) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }

    if (liveRole !== "admin" && liveRole !== "coach") {
      // User biasa atau akses admin sudah dicabut: dilarang mengakses halaman admin
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (
      liveRole === "coach" &&
      !path.startsWith("/admin/coaching") &&
      !path.startsWith("/admin/kelas")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/coaching";
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
    if (liveRole === "admin" || liveRole === "coach") {
      const url = request.nextUrl.clone();
      url.pathname = accountHome(liveRole);
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
