import { SESSION_MAX_AGE } from "@/lib/accountRules";

export interface CookieOptions {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: boolean | "lax" | "strict" | "none";
  secure?: boolean;
}

/**
 * Ensures session cookie maxAge does not exceed SESSION_MAX_AGE (30 days).
 */
export function sessionCookie(options: CookieOptions = {}): CookieOptions {
  return options.maxAge ? { ...options, maxAge: Math.min(options.maxAge, SESSION_MAX_AGE) } : options;
}
