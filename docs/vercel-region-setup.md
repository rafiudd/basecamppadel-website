# Panduan Pengaturan Region Vercel (Singapore — sin1)

Dokumen ini ditujukan untuk tim DevOps / PIC Deployment Basecamp Padel.

---

## 1. Mengapa Ini Kritis?

- **Database MongoDB Atlas kita berlokasi di:** **Singapore (`ap-southeast-1`)**.
- **Default Vercel Function (Serverless):** **US East (`iad1` — Washington D.C.)**.
- **Dampak:** Setiap query database harus menempuh jarak Samudra Pasifik bolak-balik (**±200ms – 250ms per query**).
  - Jika 1 halaman melakukan 5 query serial = **1,2 detik delay murni kabel laut** sebelum data diproses.
- **Hasil setelah disetel ke Singapore (`sin1`):** Latensi per query turun dari ~220ms menjadi **< 3ms** (menghemat 1–2 detik waktu muat halaman secara instan dan gratis).

---

## 2. Cara Mengubah Region di Dashboard Vercel (Bisa di Akun Hobby / Gratisan)

Akun Vercel gratisan (Hobby plan) **sepenuhnya mendukung** pemilihan region serverless function ke Singapore (`sin1`). Anda tidak perlu bayar atau upgrade ke Pro.

### Langkah-langkah:
1. Buka dashboard Vercel: [vercel.com](https://vercel.com) dan login.
2. Pilih proyek **Basecamp Padel Website**.
3. Klik tab **Settings** di menu atas.
4. Di bilah sisi kiri, klik menu **Functions**.
5. Gulir ke bagian **Function Region**.
6. Klik dropdown yang saat ini bertuliskan `Washington, D.C., USA (East) - iad1` (atau region lain).
7. Pilih: **`Singapore - sin1`**.
8. Klik tombol **Save**.
9. **PENTING:** Perubahan region hanya berlaku untuk deployment baru. Buka tab **Deployments**, klik titik tiga (`...`) pada deployment terbaru, lalu klik **Redeploy**.

---

## 3. Opsi Alternatif: Melalui File `vercel.json` di Repository

Jika ingin region otomatis terkunci di kode repositori (agar tidak berubah jika ada deploy baru), cukup tambahkan file `vercel.json` di root direktori proyek dengan isi:

```json
{
  "regions": ["sin1"]
}
```

Setelah file ini di-push ke branch utama, seluruh deployment Vercel berikutnya otomatis dieksekusi di Singapore (`sin1`).
