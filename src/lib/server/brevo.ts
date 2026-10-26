const BREVO_BASE_URL = "https://api.brevo.com/v3";

export interface SendEmailRecipient {
  email: string;
  name?: string;
}

export interface SendBrevoEmailParams {
  to: string | SendEmailRecipient;
  subject: string;
  textContent?: string;
  htmlContent?: string;
  replyTo?: SendEmailRecipient;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  code?: string;
  raw?: any;
}

/**
 * Mendapatkan API Key Brevo dari environment.
 */
export function getBrevoApiKey(): string {
  return process.env.BREVO_API_KEY?.trim() || "";
}

/**
 * Mendapatkan konfigurasi pengirim default Brevo.
 */
export function getBrevoSender(): { email: string; name: string } {
  return {
    email: process.env.BREVO_SENDER_EMAIL?.trim() || "basecamppadel@gmail.com",
    name: process.env.BREVO_SENDER_NAME?.trim() || "Basecamp Padel",
  };
}

/**
 * Validasi alamat email sederhana.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Membuat template HTML email responsif dan elegan dengan nuansa Basecamp Padel.
 */
export function generateCoachingReportEmailHtml(params: {
  evaluation?: string;
  nextPractice?: string;
  playerName?: string;
  sessionTitle?: string;
}): string {
  const { evaluation, nextPractice, playerName, sessionTitle } = params;

  const evalHtml = evaluation
    ? `<div style="background-color: #221F30; border: 1px solid rgba(251, 247, 241, 0.1); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; color: #FFD43B; text-transform: uppercase; letter-spacing: 0.5px;">Evaluasi Coach:</p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #FBF7F1; white-space: pre-wrap;">${evaluation.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
      </div>`
    : "";

  const nextHtml = nextPractice
    ? `<div style="background-color: #221F30; border: 1px solid rgba(251, 247, 241, 0.1); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; color: #2F9E5C; text-transform: uppercase; letter-spacing: 0.5px;">Fokus Latihan Berikutnya:</p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #FBF7F1; white-space: pre-wrap;">${nextPractice.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Catatan Coaching & Rapor — Basecamp Padel</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0E0C15; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FBF7F1;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0E0C15; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #17151F; border: 1px solid rgba(251, 247, 241, 0.12); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 28px 20px 28px; background: linear-gradient(135deg, #1A162B 0%, #17151F 100%); border-bottom: 1px solid rgba(251, 247, 241, 0.08); text-align: left;">
              <span style="display: inline-block; padding: 4px 10px; background-color: rgba(255, 212, 59, 0.15); color: #FFD43B; border-radius: 999px; font-size: 11px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 8px;">🎾 Basecamp Padel Clinic</span>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #FBF7F1; line-height: 1.3;">Catatan Latihan & Rapor Baru</h1>
              ${sessionTitle ? `<p style="margin: 6px 0 0 0; font-size: 13px; color: rgba(251, 247, 241, 0.65);">${sessionTitle.replace(/</g, "&lt;")}</p>` : ""}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 24px 28px;">
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: rgba(251, 247, 241, 0.9);">
                Halo${playerName ? ` <strong>${playerName.replace(/</g, "&lt;")}</strong>` : ""}! Catatan evaluasi latihan kamu dari coach sudah keluar dan siap dipelajari.
              </p>

              ${evalHtml}
              ${nextHtml}

              <!-- Button CTA -->
              <div style="text-align: center; margin: 32px 0 24px 0;">
                <a href="https://www.basecamppadel.id/akun?tab=notes" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2F9E5C; color: #FFFFFF; font-size: 14px; font-weight: bold; text-decoration: none; padding: 13px 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(47, 158, 92, 0.35);">
                  Buka Rapor & Analisis Lengkap →
                </a>
              </div>

              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: rgba(251, 247, 241, 0.6); text-align: center;">
                Sampai ketemu di sesi latihan berikutnya di lapangan Basecamp Padel! 🚀
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 18px 28px; background-color: rgba(14, 12, 21, 0.6); border-top: 1px solid rgba(251, 247, 241, 0.08); text-align: center; font-size: 11px; color: rgba(251, 247, 241, 0.45); line-height: 1.5;">
              © ${new Date().getFullYear()} Basecamp Padel Indonesia. Email ini dikirim otomatis untuk peserta klinik padel.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Mengirim email transaksional via Brevo REST API v3.
 */
export async function sendBrevoEmail(params: SendBrevoEmailParams): Promise<SendEmailResult> {
  const { to, subject, textContent, htmlContent, replyTo } = params;

  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    return {
      success: false,
      error:
        "Brevo API Key belum dikonfigurasi. Silakan masukkan variabel BREVO_API_KEY pada file .env.",
    };
  }

  const recipientEmail = typeof to === "string" ? to.trim() : to.email.trim();
  const recipientName = typeof to === "string" ? undefined : to.name?.trim();

  if (!isValidEmail(recipientEmail)) {
    return {
      success: false,
      error: `Alamat email tidak valid: "${recipientEmail}".`,
    };
  }

  const sender = getBrevoSender();

  const payload: Record<string, any> = {
    sender,
    to: [
      {
        email: recipientEmail,
        ...(recipientName ? { name: recipientName } : {}),
      },
    ],
    subject: subject || "Notifikasi Basecamp Padel",
  };

  if (htmlContent) {
    payload.htmlContent = htmlContent;
  }
  if (textContent) {
    payload.textContent = textContent;
  }
  if (!htmlContent && !textContent) {
    payload.textContent = subject;
  }

  if (replyTo && isValidEmail(replyTo.email)) {
    payload.replyTo = {
      email: replyTo.email.trim(),
      ...(replyTo.name ? { name: replyTo.name.trim() } : {}),
    };
  }

  try {
    const res = await fetch(`${BREVO_BASE_URL}/smtp/email`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg =
        data?.message ||
        `Gagal mengirim email via Brevo (HTTP ${res.status}: ${res.statusText})`;
      return {
        success: false,
        error: errorMsg,
        code: data?.code,
        raw: data,
      };
    }

    const messageId = data?.messageId || "sent";
    return {
      success: true,
      messageId,
      raw: data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Terjadi kesalahan jaringan saat menghubungi API Brevo.",
    };
  }
}

/**
 * Memeriksa status konfigurasi akun Brevo.
 */
export async function checkBrevoStatus(): Promise<{
  configured: boolean;
  email?: string;
  plan?: string;
  error?: string;
}> {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    return {
      configured: false,
      error: "BREVO_API_KEY belum dikonfigurasi di file .env",
    };
  }

  try {
    const res = await fetch(`${BREVO_BASE_URL}/account`, {
      method: "GET",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        configured: false,
        error: `Autentikasi Brevo gagal (HTTP ${res.status})`,
      };
    }

    const data = await res.json();
    return {
      configured: true,
      email: data?.email,
      plan: data?.plan?.[0]?.type,
    };
  } catch (err: any) {
    return {
      configured: false,
      error: err?.message || "Gagal menghubungi API Brevo",
    };
  }
}
