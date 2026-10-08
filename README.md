# Basecamp Padel — Website + CMS

Next.js 16 (App Router) + Supabase. Public site, admin CMS, and OBS overlay untuk komunitas Basecamp Padel.

## Routes

| Route | Apa |
| --- | --- |
| `/` | Home — hero, kartu **Live Sekarang** (muncul hanya saat ada match `is_live`, update via Realtime), why-join, komunitas, CTA |
| `/jadwal` | Grid sesi dari tabel `sessions` (published, urut tanggal) |
| `/leaderboard` | Kolom MEN (indigo) & WOMEN (coral), ranking per gender by poin, top-3 tinted |
| `/leaderboard/[playerId]` | Hero pemain + stat tiles + **Riwayat Match** (tiap baris link ke `stream_url`) |
| `/overlay` | OBS browser source 1920×1080, satu link untuk sepanjang event — scoreboard kalau ada match ON AIR, kartu "Starting Soon" otomatis kalau nggak (transparan, `?bg=1` untuk preview) |
| `/admin` | CMS (Supabase Auth, hanya user di tabel `admin_users`) |
| `/admin/live` | Score Control → tulis langsung ke `matches` + tombol **Selesaikan Match** |
| `/admin/sessions` | CRUD jadwal |
| `/admin/players` | CRUD pemain + upload foto cutout ke Storage bucket `players` |

## Setup

1. Buat project di [supabase.com](https://supabase.com), aktifkan **Authentication → Providers → Email**.
2. Salin `.env.example` → `.env.local`, isi:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Settings → API)
   - `SUPABASE_DB_URL` (Settings → Database → Connection string URI, pilih *Session pooler*)
   - `SUPABASE_SERVICE_ROLE_KEY` (Settings → API → service_role — rahasia, hanya untuk CLI)
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` — akun admin yang mau dibuat
3. ```bash
   npm install
   npm run db:setup     # migrate + seed data contoh + bikin user admin
   npm run dev
   ```
   Perintah terpisah: `npm run db:migrate`, `npm run db:seed` (`-- --force` untuk seed ulang), `npm run db:admin`.
4. Login di `http://localhost:3000/admin/login` dengan `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
5. Ganti foto placeholder: `public/images/hero-placeholder.svg` dan `community-placeholder.svg`
   (atau ubah `src` di `src/app/page.tsx` ke `/images/hero.jpg` dst).

Tanpa CLI: jalankan `supabase/migrations/0001_init.sql` lalu `supabase/seed.sql` di SQL Editor, bikin user di
Authentication → Users, lalu `insert into public.admin_users (user_id) select id from auth.users where email = '...'`.

## Alur live match

1. `/admin/live` → **+ Match baru** (opsional pilih sesi → label & venue terisi).
2. Pilih pemain per tim (untuk riwayat/leaderboard), atau ketik nama tim manual.
3. Isi URL stream YouTube, START timer, toggle **LIVE**. Home & overlay langsung ikut (Realtime).
4. Di OBS: Browser Source → `https://domain/overlay?match=<id>` (atau `/overlay` saja = ikut match yang LIVE), 1920×1080.
5. Selesai → **Selesaikan Match** → pilih pemenang + poin → `finalize_match()` menulis `match_history`
   untuk tiap pemain, update poin/W-L, dan mematikan LIVE.

Poin pemain = `sum(match_history.points_delta)` + `points_adjustment` (koreksi manual di form pemain). W-L dihitung otomatis dari `match_history`.

## Struktur

```
src/app/            routes (public, admin, overlay, auth)
src/app/admin/actions.ts   server actions (CRUD, finalize)
src/components/     UI (Nav, LiveCard, RankRow, OverlayScoreboard, admin/ScoreControl …)
src/lib/supabase/   client / server / proxy helpers
src/lib/useLiveMatch.ts    Realtime subscription hook
src/lib/database.types.ts  tipe tabel (regenerate: supabase gen types typescript)
src/proxy.ts        auth gate untuk /admin
supabase/migrations 0001_init.sql
```

Font Inter + Space Grotesk di-self-host (`src/fonts`) supaya overlay tetap jalan tanpa akses Google Fonts.
