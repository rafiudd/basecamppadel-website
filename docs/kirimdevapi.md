# Integrasi WhatsApp Provider: Kirimdev (kirimdev.com)

Dokumen ini menjelaskan implementasi dan konfigurasi integrasi **Kirimdev** sebagai WhatsApp Provider otomatis pada platform Basecamp Padel.

---

## 1. Konfigurasi Environment (`.env`)

Tambahkan variabel berikut pada file `.env`:

```env
# API Key dari Dashboard Kirimdev
KIRIMDEV_API_KEY=kdv_live_wqdp-x2WMowej68wd5wGahJd

# (Opsional) Meta WhatsApp Business Phone Number ID.
# Jika dikosongkan, sistem akan otomatis mendeteksi Phone Number ID pertama yang berstatus 'connected' dari Kirimdev API.
KIRIMDEV_PHONE_NUMBER_ID=
```

---

## 2. Arsitektur & File Terkait

1. **Client / Service Provider:**
   - [`src/lib/server/kirimdev.ts`](file:///home/jamaludinak/Projects/Diraya/basecamppadel-website/src/lib/server/kirimdev.ts)
   - Berisi fungsi:
     - `sendKirimdevWhatsAppMessage({ to, message, previewUrl? })`: Mengirim pesan teks langsung ke nomor tujuan via endpoint Meta-compatible Cloud API `https://api.kirimdev.com/v1/{phone_number_id}/messages`.
     - `resolveKirimdevPhoneNumberId()`: Mengambil `phone_number_id` dari env atau query dinamis ke `GET /accounts?status=connected`.
     - `checkKirimdevStatus()`: Verifikasi API key & daftar nomor WhatsApp yang terhubung.

2. **Server Action:**
   - [`src/app/admin/coaching/actions.ts`](file:///home/jamaludinak/Projects/Diraya/basecamppadel-website/src/app/admin/coaching/actions.ts)
   - Fungsi `sendCoachingReportWhatsAppAction`: Menerima input ID pemain, nomor WhatsApp, dan pesan evaluasi coach, lalu mengeksekusi pengiriman via Kirimdev dan memperbarui kontak pemain jika ada perubahan.

3. **User Interface (Admin/Coach):**
   - [`src/app/admin/coaching/components/SendNotificationModal.tsx`](file:///home/jamaludinak/Projects/Diraya/basecamppadel-website/src/app/admin/coaching/components/SendNotificationModal.tsx)
   - Menampilkan tombol **"Kirim WhatsApp Otomatis (Kirimdev)"** lengkap dengan indikator proses (spinner) dan feedback toast.
   - Tetap menyediakan opsi cadangan **"Buka WA Web / App (Manual)"** dan **"Kirim via Email"**.

---

## 3. Catatan Penting Mengenai Nomor Pengirim

- API Key `kdv_live_wqdp-x2WMowej68wd5wGahJd` telah terhubung ke workspace: **"padellens id's Workspace"**.
- Agar pesan dapat terkirim, pastikan nomor WhatsApp pengirim telah di-scan / dihubungkan (*connected*) di dashboard [kirimdev.com](https://kirimdev.com).
- Jika nomor pengirim belum terhubung di dashboard, sistem akan memberikan pesan panduan ramah kepada admin/coach untuk menghubungkan nomor atau menggunakan opsi manual (*wa.me*).
