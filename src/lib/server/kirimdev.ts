import { normalizeWhatsAppNumber } from "../coachingRules.ts";

const DEFAULT_KIRIMDEV_API_KEY = "kdv_live_wqdp-x2WMowej68wd5wGahJd";
const KIRIMDEV_BASE_URL = "https://api.kirimdev.com/v1";

export interface KirimdevAccount {
  object: string;
  phone_number_id: string | null;
  phone_number: string | null;
  name: string | null;
  status: string;
  meta_status: string | null;
  customer_id: string | null;
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  code?: string;
  raw?: any;
}

/**
 * Mendapatkan API key Kirimdev dari environment atau fallback default yang dikonfigurasi.
 */
export function getKirimdevApiKey(): string {
  const envKey = process.env.KIRIMDEV_API_KEY?.trim();
  return envKey || DEFAULT_KIRIMDEV_API_KEY;
}

/**
 * Mendapatkan daftar akun WhatsApp yang terhubung di workspace Kirimdev.
 */
export async function getKirimdevAccounts(status: "connected" | "all" = "connected"): Promise<KirimdevAccount[]> {
  const apiKey = getKirimdevApiKey();
  if (!apiKey) return [];

  try {
    const res = await fetch(`${KIRIMDEV_BASE_URL}/accounts?status=${status}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) return [];

    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

/**
 * Menemukan phone_number_id yang dapat dipakai untuk mengirim pesan.
 * 1. Cek KIRIMDEV_PHONE_NUMBER_ID di env.
 * 2. Cek akun WhatsApp dengan status connected dari API Kirimdev.
 */
export async function resolveKirimdevPhoneNumberId(): Promise<string> {
  const envPhoneId = process.env.KIRIMDEV_PHONE_NUMBER_ID?.trim();
  if (envPhoneId) {
    return envPhoneId;
  }

  const accounts = await getKirimdevAccounts("connected");
  const firstConnected = accounts.find((acc) => acc.phone_number_id);

  if (firstConnected?.phone_number_id) {
    return firstConnected.phone_number_id;
  }

  throw new Error(
    "Tidak ditemukan nomor WhatsApp yang aktif di akun Kirimdev Anda. " +
    "Silakan hubungkan nomor WhatsApp di dashboard kirimdev.com atau atur KIRIMDEV_PHONE_NUMBER_ID di file .env."
  );
}

/**
 * Mengirim pesan WhatsApp teks langsung melalui API Kirimdev (Meta-compatible Cloud API).
 */
export async function sendKirimdevWhatsAppMessage(params: {
  to: string;
  message: string;
  previewUrl?: boolean;
  phoneNumberId?: string;
}): Promise<SendWhatsAppResult> {
  const { to, message, previewUrl = true, phoneNumberId: explicitPhoneId } = params;

  const apiKey = getKirimdevApiKey();
  if (!apiKey) {
    return {
      success: false,
      error: "Kirimdev API Key belum diset.",
    };
  }

  const cleanTo = normalizeWhatsAppNumber(to);
  if (!cleanTo || cleanTo.length < 9) {
    return {
      success: false,
      error: `Nomor WhatsApp tidak valid: "${to}". Pastikan format nomor benar (contoh: 08123456789 atau 628123456789).`,
    };
  }

  let resolvedPhoneId: string;
  try {
    resolvedPhoneId = explicitPhoneId?.trim() || (await resolveKirimdevPhoneNumberId());
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Gagal menentukan pengirim WhatsApp (Phone Number ID).",
    };
  }

  const endpoint = `${KIRIMDEV_BASE_URL}/${resolvedPhoneId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanTo,
    type: "text",
    text: {
      body: message,
      preview_url: previewUrl,
    },
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg =
        data?.error?.message ||
        `Gagal mengirim pesan (HTTP ${res.status}: ${res.statusText})`;
      return {
        success: false,
        error: errorMsg,
        code: data?.error?.code,
        raw: data,
      };
    }

    const messageId = data?.messages?.[0]?.id || data?.id || "sent";
    return {
      success: true,
      messageId,
      raw: data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Terjadi kesalahan jaringan saat menghubungi API Kirimdev.",
    };
  }
}

/**
 * Memeriksa status koneksi akun dan API key Kirimdev.
 */
export async function checkKirimdevStatus(): Promise<{
  configured: boolean;
  organization?: string;
  accounts: KirimdevAccount[];
  error?: string;
}> {
  const apiKey = getKirimdevApiKey();
  if (!apiKey) {
    return { configured: false, accounts: [], error: "API Key tidak tersedia" };
  }

  try {
    const [meRes, accs] = await Promise.all([
      fetch(`${KIRIMDEV_BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
      }),
      getKirimdevAccounts("all"),
    ]);

    if (!meRes.ok) {
      return { configured: false, accounts: [], error: `Autentikasi gagal: HTTP ${meRes.status}` };
    }

    const meData = await meRes.json();
    return {
      configured: true,
      organization: meData?.data?.organization?.name || "Kirimdev Organization",
      accounts: accs,
    };
  } catch (err: any) {
    return {
      configured: false,
      accounts: [],
      error: err?.message || "Gagal menghubungi Kirimdev",
    };
  }
}
