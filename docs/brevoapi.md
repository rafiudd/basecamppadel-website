# Integrasi Email Provider: Brevo (brevo.com)

Dokumen ini menjelaskan implementasi dan konfigurasi pengiriman email transaksional menggunakan **Brevo** (sebelumnya Sendinblue) pada platform Basecamp Padel.

---

## 1. Konfigurasi Environment (`.env`)

Kredensial email disiapkan di file `.env`. Saat API key sudah siap, masukkan nilainya ke baris `BREVO_API_KEY`:

```env
# BREVO EMAIL PROVIDER
# Dapatkan API key di: https://app.brevo.com/settings/keys/api
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Pengirim default
BREVO_SENDER_EMAIL=basecamppadel@gmail.com
BREVO_SENDER_NAME=Basecamp Padel
```

---

## 2. Arsitektur & File Terkait

1. **Service Client:**
   - [`src/lib/server/brevo.ts`](file:///home/jamaludinak/Projects/Diraya/basecamppadel-website/src/lib/server/brevo.ts)
   - Fungsi:
     - `sendBrevoEmail({ to, subject, htmlContent?, textContent? })`: Mengirim email transaksional via REST API v3 Brevo (`https://api.brevo.com/v3/smtp/email`).
     - `generateCoachingReportEmailHtml(params)`: Menghasilkan template HTML email responsif dan bertema Basecamp Padel (Dark mode, badge pin, catatan coach, dan tombol CTA ke halaman profil pemain).
     - `checkBrevoStatus()`: Memverifikasi API key dan paket akun Brevo.

2. **Server Action:**
   - [`src/app/admin/coaching/actions.ts`](file:///home/jamaludinak/Projects/Diraya/basecamppadel-website/src/app/admin/coaching/actions.ts#L425-L478)
   - Action `sendCoachingReportEmailAction`: Mengirimkan rapor coaching pemain ke alamat email penerima. Jika API key belum diisi, sistem memberikan pesan informatif bahwa API key belum diset dan mengarahkan admin/coach untuk memakai opsi pengiriman manual (*mailto*).

3. **User Interface (Admin/Coach):**
   - [`src/app/admin/coaching/components/SendNotificationModal.tsx`](file:///home/jamaludinak/Projects/Diraya/basecamppadel-website/src/app/admin/coaching/components/SendNotificationModal.tsx)
   - Menyediakan tombol **"Kirim Email (Brevo)"** untuk pengiriman otomatis satu klik langsung ke inbox pemain.
   - Tetap menyediakan opsi cadangan **"✉️ Atau Buka Aplikasi Email Default (mailto)"** jika ingin mengirim via aplikasi email lokal.
