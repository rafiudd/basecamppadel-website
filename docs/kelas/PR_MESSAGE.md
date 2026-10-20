# Pull Request: Implementasi Fitur Kelas Publik & Admin CRUD (Padel Academy)

## 📌 Ringkasan Perubahan

PR ini menambahkan modul **Fitur Kelas (Padel Academy & Coaching Clinic)** secara penuh, mencakup katalog publik yang interaktif, halaman detail kelas dengan silabus bertingkat & sistem booking WhatsApp, serta dashboard operasional Admin untuk manajemen kelas, jadwal, peserta, dan ulasan.

Semua implementasi telah lolos pengujian fungsional otomatis (**Blackbox Testing**) pada resolusi Desktop dan Mobile dengan tingkat keberhasilan **100% (34/34 skenario PASS)**.

---

## 🎯 Fitur yang Diterapkan

### 1. Halaman Publik (`/kelas` & `/kelas/[slug]`)
- **Katalog Kelas Interaktif (`/kelas`)**:
  - Hero banner dengan counter peserta alumni.
  - Filter kategori (*Dasar, Teknik, Posisi & taktik, Mental & fisik, Program khusus*).
  - Filter pin level warna (*Putih, Kuning, Biru, Merah, Hitam*).
  - Dropdown urutkan (*Paling populer, Rating tertinggi, Harga terendah/tertinggi, Terbaru*).
  - Pencarian kata kunci real-time + state pencarian kosong (*Empty State*) & tombol *Reset filter*.
  - Grid card kelas lengkap dengan strip warna pin, thumbnail/cover, rating, total alumni, durasi, dan harga.
- **Detail Kelas & Booking (`/kelas/[slug]`)**:
  - Hero detail dengan badge kecocokan pin level & pill spesifikasi.
  - Media player: preview video MP4/YouTube dan galeri foto resolusi tinggi dengan mode lightbox.
  - Silabus mendalam: *"Yang kamu pelajari"*, rincian drill tiap sesi, dan kartu profil coach.
  - Ulasan terverifikasi dengan histogram skor bintang 1–5.
  - Kolom diskusi publik dan tanya-jawab dengan pelatih (*Coach badge*).
  - Sticky booking drawer/sidebar: pemilihan jadwal aktif via radio button, penanda sisa slot, tombol WhatsApp booking otomatis dengan pesan terformat.

### 2. Halaman Admin & CRUD Kelas (`/admin/kelas/*`)
- **Admin Dashboard & Katalog (`/admin/kelas`)**:
  - 4 Kartu KPI: Kelas aktif (+ draft), Peserta bulan ini, Rating rata-rata (+ total ulasan), Komentar belum dibalas.
  - Toolbar filter pencarian real-time, kategori, status (*Aktif, Draft, Penuh*), dan sorting.
  - Tabel data kelas dengan visual slot capacity progress bar & tombol aksi *"Buka"*.
- **Formulir Buat & Edit Kelas (`/admin/kelas/new` & `/admin/kelas/[id]/edit`)**:
  - Input judul, slug otomatis, kategori, deskripsi, dan pilihan multi-pin level.
  - Upload & input media: preview video URL, cover image, dan multi-photo gallery.
  - Format sesi, durasi, kapasitas jadwal, minimal peserta, dan penetapan coach default.
  - Dynamic input *"Yang dipelajari"* dan breakdown drill *"Isi tiap sesi"*.
  - Opsi simpan sebagai draft atau publikasi langsung ke halaman publik.
- **Detail Operasional Kelas (`/admin/kelas/[id]`)**:
  - Ringkasan kelas & KPI operasional.
  - Manajemen jadwal: tambah jadwal baru, status kuota otomatis (*Aktif / Penuh*).
  - Manajemen peserta per jadwal: tambah manual dari database pemain, status pembayaran (*Lunas / Menunggu*), dan absensi kehadiran per sesi (*Hadir S1, Hadir S2*).
  - Moderasi komentar & ulasan: balas sebagai coach resmi atau sembunyikan komentar.

---

## 🧪 Bukti Pengujian (Blackbox Test Evidence)

Pengujian end-to-end otomatis dijalankan dengan Playwright/Puppeteer Headless Chromium mencakup Desktop (`1280x900`) dan Mobile (`390x844`).

| No | Modul / Skenario Pengujian | Hasil Uji | Screenshot Desktop | Screenshot Mobile |
|:---:|---|:---:|:---:|:---:|
| 1 | **Katalog Publik (Render Awal)** | ✅ PASS | [01_public_catalog.png](./screenshots/desktop/01_public_catalog.png) | [01_public_catalog.png](./screenshots/mobile/01_public_catalog.png) |
| 2 | **Filter Kategori (Teknik)** | ✅ PASS | [02_public_filter.png](./screenshots/desktop/02_public_filter.png) | [02_public_filter.png](./screenshots/mobile/02_public_filter.png) |
| 3 | **Pencarian Keyword & Empty State** | ✅ PASS | [03_public_empty_search.png](./screenshots/desktop/03_public_empty_search.png) | [03_public_empty_search.png](./screenshots/mobile/03_public_empty_search.png) |
| 4 | **Detail Kelas (Hero & Media Preview)** | ✅ PASS | [04_public_detail_hero.png](./screenshots/desktop/04_public_detail_hero.png) | [04_public_detail_hero.png](./screenshots/mobile/04_public_detail_hero.png) |
| 5 | **Detail Silabus, Sesi Drill & Coach** | ✅ PASS | [05_public_detail_syllabus.png](./screenshots/desktop/05_public_detail_syllabus.png) | [05_public_detail_syllabus.png](./screenshots/mobile/05_public_detail_syllabus.png) |
| 6 | **Pilihan Jadwal Slot & Booking CTA** | ✅ PASS | [06_public_detail_booking.png](./screenshots/desktop/06_public_detail_booking.png) | [06_public_detail_booking.png](./screenshots/mobile/06_public_detail_booking.png) |
| 7 | **Ulasan Rating Bintang & Komentar Q&A** | ✅ PASS | [07_public_detail_reviews_qa.png](./screenshots/desktop/07_public_detail_reviews_qa.png) | [07_public_detail_reviews_qa.png](./screenshots/mobile/07_public_detail_reviews_qa.png) |
| 8 | **Admin Dashboard & 4 Kartu KPI** | ✅ PASS | [08_admin_catalog.png](./screenshots/desktop/08_admin_catalog.png) | [08_admin_catalog.png](./screenshots/mobile/08_admin_catalog.png) |
| 9 | **Admin Filter Realtime** | ✅ PASS | [09_admin_filter.png](./screenshots/desktop/09_admin_filter.png) | [09_admin_filter.png](./screenshots/mobile/09_admin_filter.png) |
| 10 | **Form Buat Kelas Baru (`/new`)** | ✅ PASS | [10_admin_create_form.png](./screenshots/desktop/10_admin_create_form.png) | [10_admin_create_form.png](./screenshots/mobile/10_admin_create_form.png) |
| 11 | **Create Kelas Baru (POST & Redirect)** | ✅ PASS | [11_admin_create_success_detail.png](./screenshots/desktop/11_admin_create_success_detail.png) | [11_admin_create_success_detail.png](./screenshots/mobile/11_admin_create_success_detail.png) |
| 12 | **Buka Form Tambah Jadwal** | ✅ PASS | [12_admin_schedule_modal.png](./screenshots/desktop/12_admin_schedule_modal.png) | [12_admin_schedule_modal.png](./screenshots/mobile/12_admin_schedule_modal.png) |
| 13 | **Tambah Jadwal Operasional Baru** | ✅ PASS | [13_admin_schedule_added.png](./screenshots/desktop/13_admin_schedule_added.png) | [13_admin_schedule_added.png](./screenshots/mobile/13_admin_schedule_added.png) |
| 14 | **Form Edit Kelas Pre-populated** | ✅ PASS | [14_admin_edit_form.png](./screenshots/desktop/14_admin_edit_form.png) | [14_admin_edit_form.png](./screenshots/mobile/14_admin_edit_form.png) |
| 15 | **Submit Perubahan Data Kelas (UPDATE)** | ✅ PASS | [15_admin_edit_saved.png](./screenshots/desktop/15_admin_edit_saved.png) | [15_admin_edit_saved.png](./screenshots/mobile/15_admin_edit_saved.png) |
| 16 | **Verifikasi Kelas Baru di Katalog Publik** | ✅ PASS | [16_public_verified_new_class.png](./screenshots/desktop/16_public_verified_new_class.png) | [16_public_verified_new_class.png](./screenshots/mobile/16_public_verified_new_class.png) |
| 17 | **Verifikasi Detail Kelas Baru di Publik** | ✅ PASS | [17_public_verified_new_class_detail.png](./screenshots/desktop/17_public_verified_new_class_detail.png) | [17_public_verified_new_class_detail.png](./screenshots/mobile/17_public_verified_new_class_detail.png) |

> Laporan lengkap tersedia di: [`docs/kelas/blackbox-testing-report.md`](./blackbox-testing-report.md)

---

## 📋 Checklist Reviewer

- [x] Rute publik `/kelas` dan `/kelas/[slug]` dapat diakses tanpa autentikasi.
- [x] Filter kategori, pin level, dan sorting berfungsi secara instan di client.
- [x] Halaman `/admin/kelas` diproteksi guard autentikasi admin & coach.
- [x] CRUD Kelas (Create, Read, Update) dan penambahan jadwal operasional berjalan normal.
- [x] Validasi form: nama kelas wajib diisi dan jumlah sesi sesuai dengan rincian materi.
- [x] Responsive layout teruji pada resolusi desktop (`1280px`) dan mobile (`390px`).
- [x] Tidak ada console errors atau lint warning yang mengganggu.
