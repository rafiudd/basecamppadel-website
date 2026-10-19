import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { sessionCookie } from "@/lib/supabase/cookies";
import { accountHome } from "@/lib/accountRules";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, sessionCookie(options)),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  request.headers.set("x-pathname", path);
  response = NextResponse.next({ request });
  const isAdminArea = path.startsWith("/admin") && !path.startsWith("/admin/login");

  if (isAdminArea) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }

    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminRow) {
      // User biasa: dilarang mengakses halaman admin
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (adminRow.role === "coach" && !path.startsWith("/admin/coaching")) {
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
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminRow) {
      const url = request.nextUrl.clone();
      url.pathname = accountHome(adminRow.role);
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
