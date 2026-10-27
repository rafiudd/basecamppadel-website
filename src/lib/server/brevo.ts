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

import { formatDateShortIndo } from "../format.ts";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface CoachingReportEmailParams {
  evaluation?: string | null;
  nextPractice?: string | null;
  playerName?: string | null;
  coachName?: string | null;
  sessionTitle?: string | null;
  sessionDate?: string | null;
  linkRapor?: string | null;
  nextSession?: {
    title: string;
    date: string;
    venue?: string | null;
    href?: string | null;
  } | null;
  linkNotifikasi?: string | null;
  linkUnsubscribe?: string | null;
}

/**
 * Membuat template HTML email responsif dan elegan dengan nuansa Basecamp Padel
 * berdasarkan desain docs/UI/email-rapor-coaching.html
 */
export function generateCoachingReportEmailHtml(params: CoachingReportEmailParams): string {
  const {
    evaluation,
    nextPractice,
    playerName,
    coachName,
    sessionTitle,
    sessionDate,
    linkRapor = "https://www.basecamppadel.id/akun?tab=catatan",
    nextSession,
    linkNotifikasi = "https://www.basecamppadel.id/akun",
    linkUnsubscribe = "https://www.basecamppadel.id/akun",
  } = params;

  const nama = escapeHtml((playerName || "").trim() || "Pemain");
  const rawCoach = (coachName || "").trim();
  const namaCoach = escapeHtml(rawCoach ? rawCoach.replace(/^coach\s+/i, "").trim() : "Basecamp");
  const evaluasi = escapeHtml((evaluation || "").trim() || "-");
  const fokus = escapeHtml((nextPractice || "").trim() || "-");
  const safeLinkRapor = escapeHtml(linkRapor || "https://www.basecamppadel.id/akun?tab=catatan");
  const safeLinkNotif = escapeHtml(linkNotifikasi || "https://www.basecamppadel.id/akun");
  const safeLinkUnsub = escapeHtml(linkUnsubscribe || "https://www.basecamppadel.id/akun");

  // Format tanggal sesi
  let formattedDate = "";
  if (sessionDate) {
    formattedDate = sessionDate.includes("-") ? formatDateShortIndo(sessionDate) : sessionDate;
  }

  const metaParts: string[] = [sessionTitle || "Clinic Evaluasi Latihan"];
  if (formattedDate) metaParts.push(formattedDate);
  metaParts.push(`Coach ${namaCoach}`);
  const metaSubtitle = escapeHtml(metaParts.join(" · "));

  // Sesi berikutnya section
  const sesiBerikutNama = escapeHtml(nextSession?.title || "Clinic & Coaching Padel");
  let sesiBerikutDate = "";
  if (nextSession?.date) {
    sesiBerikutDate = nextSession.date.includes("-") ? formatDateShortIndo(nextSession.date) : nextSession.date;
  }
  const sesiBerikutVenue = escapeHtml(nextSession?.venue || "Basecamp Padel");
  const sesiBerikutDetail = sesiBerikutDate ? `${sesiBerikutDate} · ${sesiBerikutVenue}` : sesiBerikutVenue;
  const rawLinkDaftar = nextSession?.href
    ? (nextSession.href.startsWith("http") ? nextSession.href : `https://www.basecamppadel.id${nextSession.href}`)
    : "https://www.basecamppadel.id/jadwal";
  const linkDaftar = escapeHtml(rawLinkDaftar);

  return `<!doctype html>
<html lang="id" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Rapor latihan kamu udah keluar</title>
<style>
  body { margin:0; padding:0; background:#EFE9DF; }
  a { color:#1B1650; }
  @media (max-width: 620px) {
    .container { width:100% !important; }
    .px { padding-left:20px !important; padding-right:20px !important; }
    .h1 { font-size:26px !important; }
    .stack { display:block !important; width:100% !important; text-align:left !important; }
    .stack-gap { padding-top:14px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background:#EFE9DF;">

<!-- Preheader: teks yang muncul di samping subject di inbox -->
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#EFE9DF;">
  Catatan evaluasi kamu udah siap. Cek fokus latihan buat sesi berikutnya.&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EFE9DF;">
<tr><td align="center" style="padding:32px 12px;">

<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background:#FBF7F1; border-radius:20px; overflow:hidden; border:1px solid #E4DED4;">

  <!-- Header -->
  <tr><td class="px" style="background:#17151F; padding:22px 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font-family:'Space Grotesk',Arial,sans-serif; font-weight:700; font-size:15px; line-height:1.1; color:#FBF7F1;">
        <span style="color:#FF5A3C;">BASECAMP</span><br>PADEL
      </td>
      <td align="right" style="font-family:Inter,Arial,sans-serif; font-size:12px; font-weight:600; letter-spacing:1px; color:#FFD43B;">RAPOR LATIHAN</td>
    </tr></table>
  </td></tr>

  <!-- Judul -->
  <tr><td class="px" style="padding:36px 32px 0; font-family:Inter,Arial,sans-serif;">
    <h1 class="h1" style="margin:0; font-family:'Space Grotesk',Arial,sans-serif; font-weight:700; font-size:30px; line-height:1.15; color:#17151F;">Rapor latihan kamu udah keluar</h1>
    <p style="margin:12px 0 0; font-size:14px; line-height:1.5; color:#6B6870;">${metaSubtitle}</p>
  </td></tr>

  <!-- Pembuka -->
  <tr><td class="px" style="padding:24px 32px 0; font-family:Inter,Arial,sans-serif; font-size:16px; line-height:1.6; color:#17151F;">
    <p style="margin:0 0 16px;">Halo ${nama},</p>
    <p style="margin:0;">Makasih udah ikut sesi kemarin. Coach udah nulis catatan buat kamu, ini ringkasannya:</p>
  </td></tr>

  <!-- Yang udah oke -->
  <tr><td class="px" style="padding:24px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF; border:1px solid #ECE7EF; border-radius:16px;">
      <tr><td style="padding:20px 22px; font-family:Inter,Arial,sans-serif;">
        <span style="display:inline-block; background:#FFF1B8; color:#17151F; font-size:12px; font-weight:700; border-radius:999px; padding:4px 12px;">Yang udah oke</span>
        <p style="margin:10px 0 0; font-size:16px; line-height:1.55; color:#17151F; white-space: pre-wrap;">${evaluasi}</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- Fokus berikutnya -->
  <tr><td class="px" style="padding:12px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF; border:1px solid #ECE7EF; border-radius:16px;">
      <tr><td style="padding:20px 22px; font-family:Inter,Arial,sans-serif;">
        <span style="display:inline-block; background:#FFE3DD; color:#B8321A; font-size:12px; font-weight:700; border-radius:999px; padding:4px 12px;">Fokus sesi berikutnya</span>
        <p style="margin:10px 0 0; font-size:16px; line-height:1.55; color:#17151F; white-space: pre-wrap;">${fokus}</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- CTA (bulletproof button) -->
  <tr><td class="px" align="center" style="padding:28px 32px 0; font-family:Inter,Arial,sans-serif;">
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${safeLinkRapor}" style="height:52px;v-text-anchor:middle;width:240px;" arcsize="50%" fillcolor="#FF5A3C" stroke="f">
    <center style="color:#17151F;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Lihat rapor lengkap</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-->
    <a href="${safeLinkRapor}" style="display:inline-block; background:#FF5A3C; color:#17151F; font-size:16px; font-weight:700; line-height:52px; padding:0 32px; border-radius:999px; text-decoration:none;">Lihat rapor lengkap</a>
    <!--<![endif]-->
    <p style="margin:12px 0 0; font-size:13px; line-height:1.5; color:#6B6870;">Ada nilai per teknik dan grafik progres kamu dari sesi ke sesi.</p>
  </td></tr>

  <!-- Sesi berikutnya -->
  <tr><td class="px" style="padding:28px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1B1650; border-radius:16px;">
      <tr>
        <td class="stack" style="padding:20px 22px; font-family:Inter,Arial,sans-serif; color:#FBF7F1;">
          <div style="font-size:12px; font-weight:700; letter-spacing:1px; color:#FFD43B;">SESI BERIKUTNYA</div>
          <div style="margin-top:4px; font-family:'Space Grotesk',Arial,sans-serif; font-size:18px; font-weight:700;">${sesiBerikutNama}</div>
          <div style="margin-top:4px; font-size:14px; color:#D5D2E0;">${sesiBerikutDetail}</div>
        </td>
        <td class="stack stack-gap" align="right" style="padding:20px 22px; white-space:nowrap;">
          <a href="${linkDaftar}" style="display:inline-block; background:#FBF7F1; color:#17151F; font-family:Inter,Arial,sans-serif; font-size:14px; font-weight:700; line-height:44px; padding:0 20px; border-radius:999px; text-decoration:none;">Daftar sesi</a>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Penutup -->
  <tr><td class="px" style="padding:28px 32px 36px; font-family:Inter,Arial,sans-serif; font-size:16px; line-height:1.6; color:#17151F;">
    <p style="margin:0 0 14px;">Ada yang mau ditanyain soal catatannya? Balas aja email ini, nanti dibantu jawab.</p>
    <p style="margin:0;">Sampai ketemu di lapangan!<br><strong>Coach ${namaCoach}</strong> &amp; tim Basecamp Padel</p>
  </td></tr>

  <!-- Footer -->
  <tr><td class="px" style="border-top:1px solid #E4DED4; padding:24px 32px 28px; font-family:Inter,Arial,sans-serif; font-size:12px; line-height:1.6; color:#6B6870;">
    <div style="font-family:'Space Grotesk',Arial,sans-serif; font-weight:700; font-size:13px; color:#17151F;">BASECAMP PADEL &middot; <a href="https://instagram.com/basecamppadel.id" style="color:#17151F; text-decoration:none;">@basecamppadel.id</a></div>
    <div style="margin-top:8px;">Kamu dapat email ini karena ikut sesi coaching di Basecamp Padel.</div>
    <div>Jakarta, Indonesia</div>
    <div style="margin-top:8px;"><a href="${safeLinkNotif}" style="color:#1B1650; font-weight:600;">Atur notifikasi</a> &middot; <a href="${safeLinkUnsub}" style="color:#1B1650; font-weight:600;">Berhenti berlangganan</a></div>
  </td></tr>

</table>
</td></tr>
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

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        configured: false,
        error: data?.message || `Autentikasi Brevo gagal (HTTP ${res.status})`,
      };
    }

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
