# Kendala: level pemain punya 3 daftar yang berbeda

Status: **selesai untuk daftar 1 dan 2 (opsi A, 14 Okt 2026)**. Ditulis 13 Okt 2026, saat menyambungkan badge warna level di profil pemain (DEV-549, D.1) dengan admin coaching (DEV-546/548).

> **Yang sudah dikerjakan:**
> - `LEVELS` di `src/lib/config.ts` sekarang sama dengan `LEVEL_NAMES` (Rookie, Beginner, Low Bronze, Bronze, Silver). Dipakai di form dan filter Admin → Pemain serta filter pemain di sesi coaching.
> - Migrasi `0015_player_levels.sql` memetakan data lama sesuai tabel opsi A di bawah. Hasilnya: Andra, Pao Pao, Rayhan, Sari → Low Bronze; Yonathan → Beginner.
> - Constraint `players_level_check` sekarang hanya mengizinkan 5 level tersebut.
> - `supabase/seed.sql` ikut diperbarui.
>
> **Masih terbuka:** keputusan 2 (nama level tampil ke publik atau tidak), dan apakah perubahan level manual di form admin perlu dianggap override. Daftar 3 (perkiraan sendiri) sengaja tidak diubah.

## Ringkasan

Kolom `players.level` diisi dari dua tempat dengan daftar nilai yang berbeda. Akun pemain juga punya daftar ketiga. Akibatnya, sebagian pemain menyimpan nama level yang tidak dikenal oleh sistem coaching, sehingga:

- **Warna levelnya tidak bisa ditentukan**, jadi badge di profil dan titik warna di halaman pemain jatuh ke warna default (kuning).
- **Level dari form admin dan level dari penilaian coach saling menimpa** dengan daftar yang berbeda.

## Tiga daftar level

| # | Daftar | Dipakai untuk | Lokasi kode |
|---|---|---|---|
| 1 | **Beginner, Upper Beginner, Intermediate, Upper Intermediate, Advanced** (daftar lama) | Dropdown level di **Admin → Pemain** (form edit dan filter) | `src/lib/config.ts:7` (`LEVELS`)<br>`src/components/admin/players/PlayerForm.tsx:51`<br>`src/components/admin/players/PlayersList.tsx:59`<br>disimpan oleh `src/app/admin/actions.ts:146` |
| 2 | **Rookie, Beginner, Low Bronze, Bronze, Silver** (sistem coaching) | Dihitung dari nilai coach dan ditulis ke `players.level` saat penilaian dikirim. Juga dipakai untuk Override level. | `src/lib/coaching.ts:28` (`LEVEL_DEFINITIONS`, beserta warnanya)<br>`src/lib/coaching.ts:66` (`LEVEL_NAMES`)<br>ditulis oleh `src/app/admin/coaching/actions.ts:128` (kirim), `:188` (kirim semua), `:219` (override) |
| 3 | **Pemula, Beginner, Intermediate** ("Level perkiraan sendiri") | Isian pemain di Lengkapi/Edit profil (desain Profile-Setup). Disimpan terpisah di `profiles.self_level`, **tidak** menyentuh `players.level`. | `src/lib/accountRules.ts:64` (`SELF_LEVELS`)<br>`supabase/migrations/0013_profile_details.sql` |

Daftar 2 adalah satu-satunya yang punya warna (Rookie putih, Beginner kuning, Low Bronze biru, Bronze merah, Silver hitam). Warna ini dipakai di badge profil pemain dan di `/leaderboard/[playerId]`.

## Bukti di data (database dev, 13 Okt 2026)

Sebaran `players.level`:

| Level | Jumlah | Dikenal sistem coaching? |
|---|---|---|
| Beginner | 87 | ya |
| Low Bronze | 4 | ya |
| **Intermediate** | **4** | **tidak** (Andra, Pao Pao, Rayhan, Sari) |
| Rookie | 2 | ya |
| Bronze | 1 | ya |
| **Upper Beginner** | **1** | **tidak** (Yonathan) |

Cara mengecek ulang:

```sql
select level, count(*) from public.players group by 1 order by 2 desc;

-- pemain dengan level di luar sistem coaching
select name, level, level_color from public.players
where level not in ('Rookie', 'Beginner', 'Low Bronze', 'Bronze', 'Silver');
```

Sebelum migrasi `0014_coaching_privacy_fixes.sql`, ada juga pemain yang level dan warnanya tidak cocok (misalnya **Dinda Rahma: level Rookie, warna kuning**). Ini sudah diperbaiki dengan trigger yang menyamakan `level_color` dengan `level`. Trigger itu hanya mengenal daftar 2, jadi kelima pemain di atas tetap memakai warna default.

## Dampak yang terlihat

1. **Admin → Pemain:** admin bisa memilih "Upper Intermediate" atau "Advanced", padahal level itu tidak ada di sistem coaching. Sebaliknya, pemain yang sudah dinilai coach (misalnya "Low Bronze") tidak punya pilihan yang cocok di dropdown. Begitu form disimpan, levelnya berubah ke nilai daftar lama.
2. **Penilaian coach menimpa pilihan admin**, dan sebaliknya. Tidak ada satu sumber kebenaran.
3. **Warna level salah atau default** untuk pemain dengan level daftar lama: titik warna di `/leaderboard/[playerId]` (`src/app/leaderboard/[playerId]/page.tsx:97`) dan badge di profil pemain.
4. **Tidak konsisten soal siapa yang boleh melihat nama level:**
   - `/leaderboard/[playerId]` menyembunyikan nama level dari publik dan hanya menampilkan "Level" plus warnanya. Nama hanya untuk admin dan coach (`page.tsx:102`, `canSeeLevelName`).
   - Baris leaderboard menampilkan nama level ke semua orang (`src/components/RankRow.tsx:123`), dan pencarian leaderboard juga mencari berdasarkan level (`src/components/leaderboard/LeaderboardClient.tsx:23`).
   - Tiket D.1 menyebut badge "tanpa teks nama level".

## Opsi

**A. Jadikan daftar 2 (coaching) satu-satunya level** (disarankan)
- Form Admin → Pemain memakai `LEVEL_NAMES` dari `src/lib/coaching.ts`, dan `LEVELS` lama di `config.ts` dihapus.
- Migrasi data untuk lima pemain di atas, mengikuti urutan tingkat:

  | Level lama | Level baru |
  |---|---|
  | Upper Beginner | Beginner |
  | Intermediate | Low Bronze |
  | Upper Intermediate | Bronze |
  | Advanced | Silver |

  Admin tetap bisa mengoreksi lewat **Override level**.
- Perubahan level manual di form pemain sebaiknya ditandai sebagai override (`level_overridden = true`), supaya tidak langsung tertimpa oleh penilaian coach berikutnya.

**B. Sama seperti A, tapi level lama di-reset semua ke Beginner.** Coach yang menentukan ulang lewat penilaian. Lebih netral, tapi 4 pemain Intermediate turun tampilannya untuk sementara.

**C. Biarkan dua daftar.** Hanya warnanya yang dipetakan untuk level lama. Tidak disarankan, karena tumpang tindih di poin 1–2 tetap terjadi.

Untuk daftar 3 (perkiraan sendiri), tidak perlu diubah. Itu memang isian pemain dari desain, terpisah dari level resmi. Tapi labelnya bisa disamakan nanti kalau desainnya diperbarui.

## Keputusan yang dibutuhkan

1. Pilih opsi **A**, **B**, atau **C**, termasuk tabel pemetaan kalau memilih A.
2. **Apakah nama level boleh tampil ke publik?** Kalau tidak, nama level di `RankRow` dan pencarian leaderboard perlu disembunyikan, supaya sama dengan halaman pemain dan tiket D.1.
3. **Siapa yang mengerjakan.** Form Admin → Pemain dan halaman leaderboard publik dikerjakan di task admin/coaching (jamaludinak).
