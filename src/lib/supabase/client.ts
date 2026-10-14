import { createBrowserClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { sessionCookie } from "@/lib/supabase/cookies";

function readCookies() {
  if (typeof document === "undefined") return [];
  return document.cookie
    .split("; ")
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf("=");
      const name = pair.slice(0, i);
      const raw = pair.slice(i + 1);
      try {
        return { name, value: decodeURIComponent(raw) };
      } catch {
        return { name, value: raw };
      }
    });
}

function writeCookie(name: string, value: string, options: CookieOptions) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path ?? "/"}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.sameSite) parts.push(`SameSite=${options.sameSite === true ? "Strict" : options.sameSite}`);
  if (options.secure ?? location.protocol === "https:") parts.push("Secure");
  document.cookie = parts.join("; ");
}

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: readCookies,
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => writeCookie(name, value, sessionCookie(options)));
        },
      },
    },
  );
}
