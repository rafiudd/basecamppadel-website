import type { CookieOptions } from "@supabase/ssr";
import { SESSION_MAX_AGE } from "@/lib/accountRules";

/**
 * @supabase/ssr always writes its auth cookies with a 400-day max-age (cookieOptions.maxAge is
 * ignored), so every client caps it here: a login lasts 30 days from the last visit. A removal
 * (max-age 0) passes through untouched.
 */
export function sessionCookie(options: CookieOptions = {}): CookieOptions {
  return options.maxAge ? { ...options, maxAge: Math.min(options.maxAge, SESSION_MAX_AGE) } : options;
}
