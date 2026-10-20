import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/server/session";
import { accountHome } from "@/lib/accountRules";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const path = request.nextUrl.pathname;
  request.headers.set("x-pathname", path);
  response = NextResponse.next({ request });

  const sessionToken = request.cookies.get("basecamp_session")?.value;
  const user = sessionToken ? await verifySessionToken(sessionToken) : null;

  const isAdminArea = path.startsWith("/admin") && !path.startsWith("/admin/login");

  if (isAdminArea) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }

    const role = user.role;
    if (role !== "admin" && role !== "coach") {
      // User biasa: dilarang mengakses halaman admin
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (role === "coach" && !path.startsWith("/admin/coaching")) {
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

  if (path.startsWith("/admin/login") && user) {
    if (user.role === "admin" || user.role === "coach") {
      const url = request.nextUrl.clone();
      url.pathname = accountHome(user.role);
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
