# Arsitektur Admin & Live

Aturan lapisan untuk kode admin, live, dan overlay. Dependensi hanya boleh mengarah ke bawah: lapisan atas boleh memakai lapisan bawah, tidak sebaliknya.

```
components/ (UI)          ── tampilan + state UI, tanpa query Supabase di server
   │  memanggil
app/admin/**/…-actions.ts ── server action: requireAdmin → baca FormData → query/RPC → revalidate
   │  memakai
lib/server/action.ts      ── guard(), str/int/intOrNull, friendly(), type Supa
lib/*Rules.ts, competition.ts, generator.ts
                          ── aturan bisnis MURNI (tanpa I/O, tanpa import runtime), dites di tests/
   │
supabase/migrations/      ── skema, RLS, RPC, constraint (penjaga terakhir aturan penting)
```

## Aturan

1. **Aturan bisnis ditulis sebagai fungsi murni** di `src/lib/` dan dites di `tests/*.test.mjs` (`npm test`).
   - Contoh: `competition.ts` (grup, bracket), `mabarRules.ts` (jadwal Americano), `matchRules.ts` (tim main dobel, court bentrok).
   - File ini **tidak boleh** meng-import modul runtime. Hanya `import type` yang boleh, karena test dijalankan dengan type stripping Node dan alias `@/` tidak bisa di-resolve saat runtime.
2. **Server action tipis.** Server action bertugas mengecek admin, membaca input, memanggil aturan murni, menulis ke DB, lalu `revalidate…`.
   - Selalu dibungkus `guard()` dan mengembalikan `ActionState` (`{ error }` atau `null`), tidak melempar error. Next.js menyembunyikan pesan error yang dilempar di production.
   - Helper generik ada di `src/lib/server/action.ts`. Helper khusus event (`revalidateEvent`, `load`, `assertEditableRoster`) ada di `src/app/admin/events/_shared.ts`.
   - Dikelompokkan per kebutuhan:
     - `events/actions.ts`: event, tim, grup
     - `events/match-actions.ts`: jadwal, hasil, bracket
     - `events/live-actions.ts`: Mulai, ON AIR
     - `events/mabar-actions.ts`: ronde, peserta mabar
3. **Constraint penting juga dijaga database.** Contohnya satu ON AIR per court lewat unique index `matches_one_on_air_per_court`.
   - Nama constraint diterjemahkan menjadi pesan untuk admin di `CONSTRAINT_MESSAGES` (`lib/server/action.ts`).
   - Migration harus aman dijalankan ulang (`if not exists`, blok `do $$ … $$` untuk konversi sekali jalan), karena `npm run db:migrate` menjalankan semua file.
4. **Feedback UI seragam.**
   - Form ke server action → `<ActionForm successText="…">`: spinner di tombol, lalu toast sukses atau error.
   - Aksi lewat kode (`useTransition`) → `toast.result(res, "…")`, plus `<Spinner />` selama `pending`.
   - Tombol custom yang sedang loading → atribut `data-loading`.
5. **Realtime dan polling.**
   - Admin dan overlay OBS memakai `useLiveMatch` (Realtime).
   - Publik (home) memakai `usePolledLiveMatches` (polling REST), supaya tidak menghabiskan kuota koneksi Realtime.

## Status

- **Halaman publik** (`/jadwal`, `/leaderboard`) masih memakai data JSON dummy di `src/data/`. Membuatnya dinamis adalah task dan branch terpisah.
- **Belum semua lapisan bersih.** Sebagian page admin dan `lib/compData.ts`, `lib/mabar.ts` masih meng-query Supabase langsung. Rapikan bertahap saat file tersebut disentuh.
