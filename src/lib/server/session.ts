import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "basecamp_session";
const MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export type SessionPayload = {
  id: string;
  email: string;
  role?: string;
  coach_id?: string | null;
  user_metadata?: Record<string, any>;
  exp: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64urlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Own secret only: a guessable or shared fallback would let anyone forge an admin session. */
function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET belum di-set (minimal 32 karakter).");
  }
  console.warn("⚠️ SESSION_SECRET is not set; using an insecure dev-only secret");
  return "dev-only-insecure-session-secret-change-me";
}

async function getHmacKey(): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const dataStr = JSON.stringify(payload);
  const dataB64 = base64urlEncode(encoder.encode(dataStr));
  const key = await getHmacKey();
  const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(dataB64));
  const sigB64 = base64urlEncode(sigBuffer);
  return `${dataB64}.${sigB64}`;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const [dataB64, sigB64] = token.split(".");
    if (!dataB64 || !sigB64) return null;

    const key = await getHmacKey();
    const sigBytes = base64urlDecode(sigB64);
    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes as any, encoder.encode(dataB64));
    if (!isValid) return null;

    const jsonStr = decoder.decode(base64urlDecode(dataB64));
    const payload: SessionPayload = JSON.parse(jsonStr);
    if (Date.now() / 1000 > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: {
  id: string;
  email: string;
  role?: string;
  coach_id?: string | null;
  user_metadata?: Record<string, any>;
}) {
  const cookieStore = await cookies();
  const payload: SessionPayload = {
    id: user.id,
    email: user.email,
    role: user.role || "authenticated",
    coach_id: user.coach_id || null,
    user_metadata: user.user_metadata || {},
    exp: Math.floor(Date.now() / 1000) + MAX_AGE,
  };

  const token = await signSession(payload);
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return token;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionUser(): Promise<{
  id: string;
  email: string;
  role: string;
  coach_id: string | null;
  user_metadata: Record<string, any>;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  return {
    id: payload.id,
    email: payload.email,
    role: payload.role || "authenticated",
    coach_id: payload.coach_id || null,
    user_metadata: payload.user_metadata || {},
  };
}
