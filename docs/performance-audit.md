# Audit Performa — Basecamp Padel Website

> Tanggal audit awal: 27 Okt 2026 · **Pembaruan & Verifikasi: 28 Okt 2026** · Next.js 16.3.4 · React 19.2.8 · MongoDB driver 7.7 (lewat adapter bergaya Supabase)
> Cakupan: seluruh route di `src/app` (publik, akun, admin, overlay, API) + lapisan data + aset + database DEV & PROD + fitur baru (PWA, Kirimdev/Brevo, Role-scoped login).
> **Status Resolusi:** **11 dari 17 temuan tersolve** (Region Vercel + Batch 1, 2, 3, dan 4 selesai diimplementasikan pada branch `fix/performance`).

## 0. Cara membaca dokumen ini

- **Severity**: 🔴 Tinggi (terasa langsung oleh user / boros berat) · 🟠 Sedang · 🟡 Rendah / hygiene.
- **Bukti**: tiap temuan menyebut file/baris atau hasil `explain()`. Temuan yang belum diukur ditandai **(perlu verifikasi)**.
- Dokumen ini adalah **catatan audit dan acuan implementasi performa**.

### Batasan audit (jujur)

| Batasan | Dampak |
|---|---|
| Tidak ada pengukuran TTFB / LCP / bundle size nyata (tidak menjalankan `next build` agar tidak menimpa `.next` milik dev server) | Angka waktu di bawah adalah **estimasi dari jumlah query & ukuran aset**, bukan hasil stopwatch. Lihat §9 untuk baseline yang perlu diukur. |
| DEV hanya berisi data kecil (26 pemain, 11 event, 15 match); `explain()` hanya dijalankan di DEV | `explain()` di DEV tidak menunjukkan masalah kecepatan nyata. Yang dinilai adalah **bentuk query** (COLLSCAN/SORT). Untuk PROD hanya dilakukan hitungan jumlah dokumen (baca-saja), lihat Lampiran C. |
| Halaman admin dan beberapa halaman akun dibaca lewat `grep` pola query, tidak dibaca baris-per-baris | Ditandai "tinjauan pola" di tabel. |

---

## 1. Ringkasan eksekutif

Database **bukan** bottleneck hari ini (data masih kecil). Yang membuat terasa lambat adalah **cara halaman mengambil data**: terlalu banyak round-trip ke Atlas per halaman, pekerjaan yang diulang dua kali, seluruh halaman publik tidak pernah di-cache, serta beberapa pemanggilan eksternal & query tanpa index yang baru masuk dari fitur-fitur mutakhir.

### 17 temuan terpenting (12 Awal + 5 Tambahan Baru)

| # | Sev | Temuan | Dampak | Status | Bagian |
|---|---|---|---|---|---|
| 1 | 🔴 | **Latensi Region Lintas-Benua:** Atlas di **Singapore (`ap-southeast-1`)**, Vercel tanpa config default ke **US East (`iad1`)** | Tiap query hop makan **±220ms**. 5 query serial = 1,2s delay murni transmisi kabel laut | ✅ Tersolve (`vercel.json` region `sin1`) | §6.6 |
| 2 | 🔴 | Semua halaman publik dinamis (`revalidate = 0`), tidak ada cache data sama sekali | Setiap kunjungan = query Mongo penuh | ✅ Tersolve (ISR 30s & 60s pada Home, Jadwal, Leaderboard) | §3.1 |
| 3 | 🔴 | `generateMetadata` dan page memanggil loader yang sama → **dikerjakan 2×** (bahkan 4× di `/jadwal/[id]`) | Jumlah query ×2–×4 per request | ✅ Tersolve (`cache()`) | §3.2 |
| 4 | 🔴 | **Bug Mismatch Invalidasi Cache:** `revalidateEvent` memanggil `/jadwal/[slug]`, padahal route folder adalah `[id]` | Cache `/jadwal/[id]` tidak pernah terhapus; alasan kenapa dulu terpaksa `revalidate = 0` | ✅ Tersolve (`_shared.ts`) | §3.8 |
| 5 | 🔴 | Leaderboard & profil pemain menarik **semua pemain** lalu hitung rank di memori (`getActivePlayers`) | O(N) per request, juga dipakai Home hanya untuk top 3 | 🟡 Sebagian (Home top-3 & profil rank tersolve di DB; search leaderboard belum) | §3.3 |
| 6 | 🔴 | Mutasi N+1 pada `recomputePlayerStats` (loop serial 4 query per player) | Selesai turnamen 32 player = 128 query berurutan, risiko timeout serverless Vercel | ✅ Tersolve (Aggregation & `bulkWrite`) | §3.7 |
| 7 | 🔴 | Admin `/admin/events/[id]` memanggil `router.refresh()` **tiap 5 detik**, tiap refresh menjalankan ±15–20 query | Beban DB stabil walau tidak ada yang berubah | ✅ Tersolve (15s + pause saat hidden) | §5 |
| 8 | 🔴 | `PublicShell` ada di dalam tiap `page.tsx` **dan** tiap `loading.tsx` → shell (Nav, `AccountChipProvider`) di-remount saat pindah halaman; `AccountChipProvider` memanggil `/api/auth/me` tiap mount | Request tambahan + nav berkedip tiap navigasi | ✅ Tersolve (In-memory cache & fetch promise dedupe di `useAccountChip`) | §3.4 |
| 9 | 🔴 | Gambar hero 1,4 MB dan community 1,17 MB dengan `unoptimized` + `priority`; foto pemain `unoptimized` | LCP Home berat, terutama di mobile | ✅ Tersolve (Hero 307KB & Community 104KB + dynamic XLSX) | §7.1 |
| 10 | 🟠 | Polling live: 1,5 dtk (overlay/admin), 8 dtk (Home, selalu jalan walau tidak ada live) | Beban konstan di `/api/live/match` | ❌ Belum | §4 |
| 11 | 🟠 | `getEvents()` menarik seluruh `venues`, `courts`, `comp_teams`, `gen_participants` lalu `filter` di JS per event | O(E×T), tumbuh seiring data | ❌ Belum | §3.5 |
| 12 | 🟠 | Index partial pada `user_id`/`player_id` **tidak terpakai** oleh query `{user_id: "x"}` (hasil explain: COLLSCAN). Auth admin juga memakai `$or` sehingga tak bisa pakai index | Dua lookup `admin_users` tiap request admin (proxy + layout) + satu per muat halaman publik (`/api/auth/me`) | ✅ Tersolve (index sparse non-partial) | §6 |
| 13 | 🔴 | **[BARU] Koleksi `push_subscriptions` Tanpa Index Apapun (`COLLSCAN`)** | Setiap broadcast notifikasi / pengiriman rapor via PWA memicu scan penuh seluruh subscription | ✅ Tersolve (index `userId` & `email`) | §6.5, §7.4 |
| 14 | 🔴 | **[BARU] Triple-Hop Redundant Query `admin_users` per Halaman Admin (Akibat Fitur Role Scoping)** | Middleware `proxy.ts`, `AdminLayout`, dan Page Component memanggil lookup identik 3× berurutan tanpa deduplikasi React `cache()` | ✅ Tersolve (`cache(getAdminUser)`) | §5.2, §7.4 |
| 15 | 🟠 | **[BARU] Dobel HTTP Round-trip & Eksekusi Serial Notifikasi Kirimdev / Brevo** | `sendKirimdevWhatsAppMessage` memanggil `/v1/accounts` tiap kirim pesan bila ID belum diset; kirim WA + Email jalan serial | ❌ Belum | §5.3, §7.4 |
| 16 | 🟠 | **[BARU] Service Worker `fetch` Interceptor Tanpa Cache Store (`sw.js`)** | Interceptor aktif di browser mencegat setiap asset/request, tapi `cache.put` tidak pernah dipanggil → penalti overhead IPC tanpa cache hit | ❌ Belum | §7.2, §7.4 |
| 17 | 🟡 | **[BARU] PWA Install Prompt & Push Permission Di-Inject ke Layar OBS `/overlay`** | Root layout merender prompt PWA di semua halaman termasuk overlay siaran live pertandingan | ✅ Tersolve (Pathname guard) | §7.2, §7.4 |

### Yang sudah baik (jangan dirusak)

- Font self-host via `next/font/local` (`src/app/fonts.ts`), tanpa dependensi Google Fonts.
- `loading.tsx` sudah ada untuk 10 route publik + admin.
- `/kelas`, `/liga`, `/privasi`, `/syarat` sudah **statis** (terverifikasi di `.next/prerender-manifest.json`) dan admin sudah memanggil `revalidatePath("/kelas")` / `("/liga")` setelah mutasi. **Ini pola yang bisa ditiru** untuk halaman lain.
- Pool koneksi Mongo di-cache di `global` (`src/lib/mongodb.ts`).
- Endpoint `/api/live/match` sudah memberi `Cache-Control: s-maxage=1, stale-while-revalidate=2` pada cabang daftar.
- Admin events list sudah punya komponen `LinkPagination` (bisa dipakai ulang).

---

## 2. Arsitektur data (konteks)

```
page.tsx ─► createClient()  (src/lib/supabase/server.ts)
              └─► MongoClientAdapter ─► MongoQueryBuilder  (src/lib/server/mongo/queryBuilder.ts)
                                          └─► getDb() ─► Mongo Atlas
```

Adapter meniru API PostgREST (`.from().select().eq().order()`). Konsekuensi performa:

1. **Tidak ada `projection`**: `select("a,b")` tetap membawa seluruh dokumen dari Mongo; kolom hanya dipilih setelah data tiba. `select("*")` dipakai di banyak tempat.
2. **Sort dengan semantik null Postgres → sort di memori**. Jika `order()` memakai default (ASC = null terakhir, DESC = null pertama), `queryBuilder.ts` L324–360 mengambil **semua dokumen** lalu `sortInMemory`, baru `skip/limit`. `limit()` jadi tidak menghemat apa pun.
3. **`eq("id")` / `eq("user_id")` / `in("id")` → `$or: [{_id}, {id}]`**. `$or` hanya bisa memakai index jika **setiap** cabang punya index; cabang `user_id`/`id` pada koleksi tertentu tidak (lihat §6).
4. **Join (`populateRelations`) adalah query tambahan per relasi** (1 query per FK, batched `$in`), jadi bukan N+1, tapi tiap `select("*, venues(name)")` = 2 round-trip.
5. **Tidak ada transaksi / agregasi**: hitungan dan rata-rata dilakukan di JS setelah menarik seluruh baris (contoh: `getPublicClasses`, `getAdminClasses`).

---

## 3. Temuan lintas-halaman (publik)

### 3.1 🔴 Tidak ada cache data

Semua halaman publik dinamis:

| File | Setelan |
|---|---|
| `src/app/page.tsx` L9 | `revalidate = 0` |
| `src/app/jadwal/page.tsx` L6, `jadwal/[id]/page.tsx` L8 | `revalidate = 0` |
| `src/app/leaderboard/page.tsx` L5, `leaderboard/[playerId]/page.tsx` L14 | `revalidate = 0` |
| `src/app/overlay/page.tsx` | `force-dynamic` |

Ini membuat **setiap pengunjung anonim memicu query penuh**, padahal admin sudah memanggil `revalidatePath`/`revalidateEvent` setelah tiap mutasi (±50 titik di `src/app/admin/**`). Infrastruktur invalidasi sudah ada; yang hilang hanya sisi **membaca dari cache**.

Catatan penting: `/leaderboard/[playerId]` memanggil `getAdminUser()` dan `getAccount()` yang membaca `cookies()`. Itu membuat **seluruh halaman** tak bisa di-cache sebagai halaman. Solusinya cache di level **data** (bukan halaman) atau pindahkan bagian ber-cookie ke komponen terpisah.

Next.js 16 menandai `unstable_cache` sebagai digantikan `use cache` (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/unstable_cache.md`). `next.config.ts` belum mengaktifkan `cacheComponents`.

### 3.2 🔴 Pekerjaan ganda antara `generateMetadata` dan page

Next tidak men-dedupe query Mongo (hanya `fetch()`), sedangkan loader di sini bukan `fetch`. Tidak ada pemakaian React `cache()` di `src/lib`.

| Route | Loader dipanggil dua kali | Perkiraan query per request |
|---|---|---|
| `/jadwal/[id]` | `getEventByIdOrSlug` ×2 (metadata + page) **dan** `getEventMatches` (query event + `loadCompetition` lagi) | Event kompetisi: `loadCompetition` ≈ 8 query × **3 kali** + 3 query event ≈ **±27** |
| `/leaderboard/[playerId]` | `getPlayerById` ×2 → `getPlayerWithHistory` ×2 | ≈ 9 query × 2 + `getLiveMatch` + auth ≈ **±21** |
| `/liga/[slug]` | `loadLeagueBySlug` ×2 | 2 query × 2 + standings (4–5) ≈ **±9** |
| `/kelas/[slug]` | `getClassBySlug` ×2 | ≈ 6 query × 2 = **±12** |

Perbaikan paling murah: bungkus loader dengan `cache()` dari React (dedupe dalam satu request) → turun ke 1×.

### 3.3 🔴 Rank dihitung dari seluruh tabel pemain

- `getActivePlayers()` (`src/lib/queries.ts` L41) = `select("*")` semua pemain aktif, sort `points desc, name asc`.
- Dipakai oleh: **Home** (hanya untuk 3 teratas), **Leaderboard**, dan **tiap profil pemain** (hanya untuk menghitung 1 rank, L84).
- `rankByGender` mengurutkan ulang di memori (L54–64) padahal Mongo sudah mengurutkan.
- Hasil explain: `SORT > COLLSCAN` pada `{active:true}` + `{points:-1,name:1}` — tidak ada index komposit yang cocok.
- Search leaderboard 100% di client (`LeaderboardClient.tsx` L10–30) → itulah alasan seluruh daftar dikirim ke browser.

Rank satu pemain cukup `countDocuments({active:true, gender, $or:[{points:{$gt:p}}, {points:p, name:{$lt:n}}]}) + 1`.

### 3.4 🔴 Shell publik di-remount tiap navigasi

- `PublicShell` (Nav + BottomNav + Footer + Toaster + `AccountChipProvider`) dipanggil **di dalam** tiap `page.tsx` dan tiap `loading.tsx` (mis. `app/loading.tsx` L6, `jadwal/loading.tsx` L6).
- Karena berada di bawah segmen halaman, React mengganti seluruh pohon saat pindah halaman → `AccountChipProvider` mount ulang → `useEffect` memanggil `GET /api/auth/me` lagi (`useAccountChip.tsx` L18–46). Respons itu berisi `profiles` + `admin_users` (2 query, keduanya COLLSCAN karena `$or`, lihat §6).
- Efek yang terlihat: nav berkedip/hilang sebentar saat loading, dan 1 request + 2 query ekstra tiap pindah halaman.

Perbaikan: pindahkan shell ke `app/(public)/layout.tsx` (route group), sehingga Nav/provider **persisten** dan `loading.tsx` hanya berisi skeleton konten. Ini juga menyederhanakan kode (hapus `<PublicShell>` dari ±12 file).

### 3.5 🟠 Query yang menarik terlalu banyak

| Lokasi | Masalah |
|---|---|
| `getEvents()` (`lib/events.ts` L165–275) | Tarik **semua** `venues`, `courts`, `comp_teams`, `gen_participants` lalu `.filter(t => t.event_id === e.id)` untuk tiap event → O(E×T). Tidak ada batas jumlah event; "Sudah lewat" tumbuh tanpa batas. 6 query. |
| `getNextUpcomingEvent()` (`queries.ts` L125–251) | Tarik **semua** event terbit & belum selesai lalu filter tanggal di JS; lalu 2 query berurutan (live match, hitung peserta) = **waterfall 3 tahap**. |
| `getPublicClasses()` (`server/kelas.ts` L66–138) | Tarik **semua** review & **semua** participant seluruh kelas hanya untuk menghitung rata-rata/jumlah per kelas. Cocok diganti `aggregate` ($group). |
| `getPlayerWithHistory` | Setelah 4 query paralel, masih ada 3 query **berurutan** (matches → courts → events). |
| `loadLeagueStandings` | `select("*")` seluruh `matches`/`comp_teams`/`comp_team_players` semua volume. |
| `loadCompetition` | `courts` diambil **seluruh tabel** (`select("*")`) padahal hanya perlu court milik venue/event; `players` dicari dengan `Array.find` di dalam `map` (O(T×P)). |

### 3.7 🔴 Mutasi N+1 pada `recomputePlayerStats` (Risiko Timeout Vercel)

- Terletak di `src/lib/server/mongo/triggers.ts` L160–210.
- Setiap kali ada `insert`, `update`, atau `delete` pada `match_history` atau `player_awards` (misal saat score match diinput, round selesai, atau admin import hasil), trigger memanggil `recomputePlayerStats(db, playerIds)`.
- Implementasi saat ini menggunakan **loop serial per player**:
  ```ts
  for (const pid of uniqueIds) {
    const player = await playersColl.findOne({ ... }); // 1 query
    const historyRows = await historyColl.find({ player_id: pid }).toArray(); // 1 query
    const awardRows = await awardsColl.find({ player_id: pid }).toArray(); // 1 query
    await playersColl.updateOne(...); // 1 write query
  }
  ```
- **Dampak:** Setiap 1 pemain yang terpengaruh memicu **4 round-trip Mongo serial**.
  - Jika satu turnamen atau ronde selesai melibatkan 16 tim (32 pemain): 32 × 4 = **128 query berurutan**.
  - Di Vercel serverless (apalagi jika beda region, lihat §6.6), 128 hop × 20–200ms = **2,5 s/d 25 detik**, rawan memicu Vercel Serverless Execution Timeout (default 10s–15s).
- **Rekomendasi:** Ganti loop serial dengan satu query agregasi pipeline (`$facet` atau single `$group` dengan `$in: uniqueIds`) dan simpan via `bulkWrite`.

### 3.8 🔴 Bug Mismatch Route pada `revalidatePath` (Penyebab Cache Tidak Pernah Bersih)

- Di `src/app/admin/events/_shared.ts` L14:
  ```ts
  export function revalidateEvent(id: string) {
    // ...
    revalidatePath("/jadwal/[slug]", "page"); // ⚠️ BUG
  }
  ```
- Di struktur folder Next.js App Router, halaman jadwal detail dinamai:
  `src/app/jadwal/[id]/page.tsx` (menggunakan parameter `[id]`, bukan `[slug]`).
- Next.js memetakan cache segmen berdasarkan nama parameter folder persis. Memanggil `revalidatePath("/jadwal/[slug]", "page")` **secara diam-diam gagal membersihkan cache `/jadwal/[id]`**.
- Selain itu, halaman Home (`/`) yang menampilkan *Next Upcoming Event* sama sekali **tidak** di-revalidate di `revalidateEvent`.
### 3.9 🟡 Hygiene

- `src/data/*.json` (24 KB) dipakai sebagai fallback mock di `leaderboard.ts` / `events.ts` — ikut ter-bundle ke server; konten mock (`LiveCard` memakai match palsu "Rayhan / Andra" saat tidak ada live).
- `kelas/page.tsx` L25–26: teks "29 kelas" dan "1.846 pemain" **hardcoded** (DEV punya 32 kelas, PROD punya 0 kelas). Data basi di halaman statis.
- `getEventByIdOrSlug` memakai `.or("id.eq.…,slug.eq.…")` — parser `or()` di adapter memetakan `id` ke field `id`, bukan `_id`; aman karena dokumen menyimpan `id`, tapi menambah kompleksitas query.

---

## 4. Polling & real-time

| Sumber | Interval | Tujuan | Catatan |
|---|---|---|---|
| `usePolledLiveMatches` (Home, `LiveCard`) | 8 dtk | `/api/live/match?limit=6` | Jalan terus selama tab terbuka, **termasuk saat tidak ada match live**. Juga fetch langsung saat mount padahal SSR sudah membawa data awal (request pertama mubazir). Tidak berhenti saat tab tersembunyi. |
| `useLiveMatch` (overlay OBS, admin) | **1,5 dtk** | `/api/live/match?...` | Wajar untuk overlay siaran, tapi tiap request bisa memicu `offAirFallback` (beberapa query) saat tidak ada match live. Cabang `matchId` **tidak** diberi header `Cache-Control` (L17–24). |
| `EventRealtime` (admin event) | **5 dtk** `router.refresh()` | refresh seluruh halaman | Lihat §5 — paling mahal. |
| `useTick` / `CountdownBadge` | 1 dtk | tick UI lokal | Murah (tanpa jaringan). |

Endpoint `/api/live/match` **publik tanpa autentikasi dan tanpa rate limit**: N penonton × (1 request / 8 dtk) + OBS (1 request / 1,5 dtk). Header `s-maxage=1` hanya membantu bila ada CDN di depan (di Vercel: ya; self-host: tidak).

Rekomendasi arah: hentikan polling saat `document.hidden`, naikkan interval Home jika tidak ada live, dan (opsional, riset) SSE / Mongo Change Streams untuk overlay.

---

## 5. Audit per halaman

Legenda render: **S** = statis (prerender), **D** = dinamis per request. "Q" = perkiraan jumlah round-trip Mongo.

### 5.1 Halaman publik

| Route | Render | Data yang diambil | Q | Masalah utama | Rekomendasi |
|---|---|---|---|---|---|
| `/` (Home) | D (`revalidate=0`) | `getLiveMatches`, `getActivePlayers` (semua), `getNextUpcomingEvent` (waterfall 3 tahap) | ~6–7 | Hanya butuh top-3 tapi menarik semua pemain; hero 1,4 MB `unoptimized`; polling 8 dtk; fetch awal ganda | Top-3 via `find().limit(3)`; cache tag `leaderboard`/`events`; kompres + hapus `unoptimized` pada hero; Suspense per section (Live, Next event, Leaderboard) |
| `/jadwal` | D | `getEvents()` (6 query, tabel penuh) | 6 | Tarik penuh venues/courts/teams/participants; tak ada pagination "Sudah lewat" | Hitung slot via satu `aggregate` (`$group` per event); batasi past events + "muat lebih banyak"; cache tag `events` |
| `/jadwal/[id]` | D | event ×(2–3) + `loadCompetition` ×3 atau `loadMabarRounds` ×3 | ±12–27 | Pekerjaan berulang 3–4× (§3.2); `getEventMatches` memuat ulang event | `cache()` di loader; satukan event+matches dalam satu pemuatan; cache per event dengan tag `event:<id>`; event `finished` → cache lama (TTL panjang) |
| `/leaderboard` | D | `getActivePlayers` (semua) | 1 (+sort memori) | Semua pemain dikirim ke browser; search client-side; rank di memori | Pagination server-side + rank di DB + search server (keputusan sudah disepakati) |
| `/leaderboard/[playerId]` | D (cookies) | `getPlayerById` ×2, `getLiveMatch`, `getAdminUser`, `getAccount`, `loadCoaching` (kondisional) | ~21 | Dobel loader; semua pemain untuk 1 rank; ber-cookie → tak bisa di-cache halaman | `cache()`; `countDocuments` untuk rank; pisahkan bagian ber-cookie (coach notes, admin) ke komponen terpisah di dalam `<Suspense>` agar data publik bisa di-cache |
| `/kelas` | **S** | `getPublicClasses` (3 query, tarik semua review & participant) | build-time | Statis, sudah di-invalidate (`revalidatePath("/kelas")`). Agregasi di JS; teks hardcoded | Ganti ke `aggregate`; hilangkan angka hardcoded |
| `/kelas/[slug]` | D (tak ada `generateStaticParams`) | `getClassBySlug` ×2 (≈6 query) | ~12 | Dobel; tidak ikut statis padahal jarang berubah | `cache()`; `generateStaticParams` + `revalidatePath("/kelas/[slug]","page")` pada mutasi kelas |
| `/liga` | **S** | `loadLeagues` (3 query) | build-time | Sudah baik | Pertahankan |
| `/liga/[slug]` | D | `loadLeagueBySlug` ×2 + `loadLeagueStandings` (4–5) | ~9 | Dobel; standings menarik `matches` penuh | `cache()`; cache tag `league:<slug>`; (aksi admin sudah `revalidatePath("/liga/[slug]")`) |
| `/overlay` | D (`force-dynamic`) | `getEventIdBySlug`, `getLiveMatch`, `offAirFallback` | 2–5 | Wajar (siaran live) + polling 1,5 dtk | Pertahankan dinamis; pastikan cabang `matchId` ikut `Cache-Control` |
| `/masuk` | D (cookies) | `getAccount` (2 query) | 2 | Wajar | — |
| `/privasi`, `/syarat` | **S** | — | 0 | Sudah baik | — |
| `/akun` | D | `requireAccount` + `players` + `loadCoaching` (≥4) + `loadEventHistory` + `loadNextCoachingSession` | ~10 | Banyak query berurutan di dalam `loadCoaching` (skills → assessments → sessions+groups → coaches) | Paralelkan; `loadSkills` di-cache (data jarang berubah); Suspense per tab |
| `/akun/edit`, `/lengkapi`, `/sambungkan` | D | `getAccount`/`requireStep` | 2–3 | Wajar (tinjauan pola) | — |
| `/akun-demo/*` | S (4 route statis) | — | 0 | Halaman demo ikut ter-bundle & ter-prerender | Hapus dari produksi jika tidak dipakai |
| `/not-found`, `icon`, `apple-icon`, `opengraph-image`, `manifest` | S | — | 0 | `opengraph-image.tsx` dirender dinamis? (perlu verifikasi) | — |

### 5.2 Halaman admin (semuanya `force-dynamic` lewat `admin/layout.tsx` L13)

**Beban tetap tiap navigasi admin:** `proxy.ts` (verifikasi token + 1 query `admin_users` dengan `$or`) **+** `AdminLayout` (`getUser` + 1 query `admin_users`) **+** banyak halaman memanggil `getAdminUser()` lagi → minimal 2–3 lookup identik per halaman. Hasil explain: `admin_users by user_id` = **COLLSCAN**.

| Route | Data | Q | Masalah | Rekomendasi |
|---|---|---|---|---|
| `/admin` | `getAdminUser` → redirect | 2 | Redirect dua tahap | Redirect di `proxy.ts` |
| `/admin/events` | `events` semua, `venues`, `leagues` | 3 | Pagination hanya di UI (`slice`), seluruh event ditarik; `venues.find` di dalam `map` | Pagination di DB (`skip/limit` + `countDocuments`); `Map` untuk venue |
| `/admin/events/new` | players aktif (semua), venues, courts, presets, hour_rates | 5 | Semua pemain untuk dropdown | OK untuk ≤ ratusan; pertimbangkan combobox async |
| **`/admin/events/[id]`** | `loadCompetition` (8) + players aktif + venues + courts + transactions + preset + score_log + hour_rates + gen_participants count + `loadMabarRounds` (4) | **±18–20** | **Di-refresh tiap 5 dtk** oleh `EventRealtime` (L57) → ±4 query/detik per tab admin yang terbuka, walau tidak ada perubahan | Hentikan `router.refresh()` buta: ganti dengan endpoint ringan yang hanya mengirim `updated_at`/versi, refresh hanya bila berubah; pause saat `document.hidden`; paling tidak naikkan ke 15–30 dtk |
| `/admin/live` | events, matches, courts, venues, freeform live, players aktif + `loadCompetition` | 7–15 | Banyak data tiap muat + `useMatchControl` memanggil `router.refresh()` | Pecah panel; tarik players hanya saat dibutuhkan |
| `/admin/live/quick`, `/live/freeform/[id]` | matches + `loadCompetition` / courts + players | 3–10 | Players aktif ditarik penuh | — |
| `/admin/players` | **semua** `players`, **semua** `profiles`, **semua** `coaching_session_players` | 3 | Tanpa pagination, tanpa filter; hitung `coachingCounts` di JS dari seluruh tabel relasi | Pagination + search server; hitung count dengan `aggregate` |
| `/admin/coaching` | sessions (+groups, players, assessments), skills, coaches, **players aktif `select(*)`**, venues, **semua events** | ~12 | `select("*")` seluruh pemain & seluruh event setiap kali, termasuk saat hanya melihat daftar sesi; `CoachingClient` memanggil `router.refresh()` setelah banyak aksi | Muat players/events hanya saat modal dibuka; `select` kolom terbatas |
| `/admin/coaching/sessions/[id]`, `/new`, `/skills`, `/rapor/[id]` | `getSessionFullData` (±10 query berurutan) | ~10 | Beberapa query berurutan di `getSessionFullData` | Paralelkan; `Promise.all` |
| `/admin/generator`, `/generator/[id]` | gen_events + courts; gen_event + participants + rounds + courts (**semua**) + players aktif + gen_matches | 2 / 6 | `courts` penuh | Filter court per event |
| `/admin/kelas` | `getAdminClasses`: classes + schedules + **semua participants** + **semua comments** + **semua reviews** | 5 | Seluruh tabel relasi ditarik hanya untuk hitung angka dasbor | `aggregate`/`countDocuments` |
| `/admin/kelas/[id]`, `/[id]/edit`, `/new` | class + schedules + participants + reviews + comments + coaches + venues + players (`select` kolom) | 8–9 | Banyak berurutan | `Promise.all` |
| `/admin/liga*`, `/admin/venues*`, `/admin/sessions`, `/admin/point*` | list/detil kecil | 2–5 | Wajar (tinjauan pola) | — |
| `/admin/users/{admin,coach,scorekeeper}` | koleksi langsung via `getDb()`; coach: `classes.find({})` penuh, `coaching_assessments` penuh dokumen | 5–8 | Dokumen penuh (`scores`, teks) hanya untuk dihitung | Projection / `countDocuments` |
| `/admin/login` | — | 0–1 | Wajar | — |
| `/admin/points`, `/points/preset` | redirect | 0 | — | — |

### 5.3 API route

| Route | Catatan |
|---|---|
| `GET /api/live/match` | Publik, polling intens (§4). Cabang `matchId` tanpa cache header. `offAirFallback` memuat beberapa query saat tidak ada match live. |
| `GET /api/auth/me` | Dipanggil tiap mount shell publik (§3.4). 2 query `$or` → COLLSCAN. Tidak ada header cache (sengaja: per-user), tapi bisa dilewati bila tidak ada cookie sesi (cek cookie di client sebelum fetch — cookie `httpOnly` jadi tak bisa dibaca JS; alternatif: render chip di server di dalam `<Suspense>`). |
| `POST /api/matches/update` | Jalur skor live (admin). Tidak diaudit mendalam. |
| `POST /api/push/send`, `/subscribe` | `webpush.ts` memakai `getDb()`; kirim ke seluruh subscriber — pastikan dikirim paralel/berbatch (perlu verifikasi). |
| `/api/auth/*`, `/auth/*`, `/api/admin/kelas/upload` | Auth/unggah; tidak ada masalah performa menonjol dari tinjauan pola. |

---

## 6. Database & index (DEV, hasil `explain()`)

### 6.1 Ukuran data (DEV)

`players 26 · events 11 · matches 15 · classes 32 · class_schedules 95 · comp_team_players 46 · coaching_skills 39 · koleksi lain < 25`. Tak ada koleksi yang cukup besar untuk memperlihatkan masalah saat ini → semua temuan di bawah bersifat **kesiapan skala**.

### 6.2 Hasil explain query panas

| Query | Plan | Status |
|---|---|---|
| `players {active} sort points,name` (leaderboard/Home) | `SORT > COLLSCAN` | 🔴 butuh index komposit |
| `players {active,gender} sort points,name` | `SORT > COLLSCAN` | 🔴 |
| `events {published} sort event_date desc, created_at desc` (`/jadwal`) | `SORT > COLLSCAN` | 🟠 |
| `events {published, status≠finished} sort event_date` (Home) | `SORT > FETCH > IXSCAN(idx_events_status_date)` | 🟡 index tak mencakup `published`, sort tetap di memori |
| `events {}` sort `created_at` (admin) | `SORT > COLLSCAN` | 🟡 |
| `profiles {user_id}` | **COLLSCAN** | 🔴 index partial tak terpakai |
| `admin_users {user_id}` | **COLLSCAN** | 🔴 (dipakai proxy + layout + `/api/auth/me`) |
| `coaching_assessments {player_id,status}` | COLLSCAN | 🟠 tak ada index `player_id` |
| `class_reviews {hidden:false}` | COLLSCAN | 🟡 |
| `courts {active} sort name`, `venues {active} sort name` | `SORT > COLLSCAN` | 🟡 (tabel kecil) |
| `leagues {published} sort created_at` | `SORT > COLLSCAN` | 🟡 |
| `comp_score_log {event_id} sort created_at` | `SORT > COLLSCAN` | 🟠 tak ada index `event_id` |
| `coaching_skills {active} sort sort_order` | `SORT > COLLSCAN` | 🟡 |
| `comp_team_players {event_id} sort slot` | `SORT > IXSCAN(unik event_id,player_id)` | 🟡 sort `slot` di memori |
| `matches {event_id} sort starts_at,bracket_pos,created_at` | `SORT > IXSCAN(idx_matches_event_idx)` | 🟡 sort di memori |
| `matches {is_live} sort updated_at` (poll live) | `IXSCAN(idx_matches_live_updated)` | ✅ |
| `events {slug}` | `EXPRESS_IXSCAN` | ✅ |
| `classes {published} sort sort_order` | IXSCAN | ✅ |
| `match_history {player_id}`, `player_awards {player_id}`, `comp_teams {event_id}`, `gen_participants {event_id}`, `class_schedules {class_id}`, `league_volumes {league_id}` | IXSCAN | ✅ |

### 6.3 Akar masalah index partial

`scripts/optimize-mongo-indexes.mjs` membuat index unik dengan `partialFilterExpression: { user_id: { $type: "string" } }` (profiles, admin_users, auth_users, dst). Query `{user_id: "abc"}` **tidak** dianggap planner sebagai subset dari `$type: "string"`, sehingga index itu tidak dipakai untuk pencarian (terbukti COLLSCAN). Index berguna untuk constraint unik, **bukan** untuk lookup. Perlu index biasa (non-partial) atau query disertai `{ $type: "string" }`. Selain itu, adapter menulis `$or:[{_id},{user_id}]` untuk `eq("user_id")` — `$or` hanya memakai index bila kedua cabang ter-index.

### 6.4 Index duplikat (overhead tulis + memori)

Hasil `listIndexes` memperlihatkan banyak index kembar akibat migrasi + skrip berulang:

| Koleksi | Index kembar |
|---|---|
| `classes` | `idx_classes_slug_idx`, `idx_classes_slug_key`, `classes_slug_key` (3 untuk `slug`), plus `idx_classes_published_idx`, `idx_classes_published_date`, `idx_classes_published_sort` |
| `events` | `idx_events_slug_key`, `idx_events_slug`, `events_slug_key` |
| `leagues` | `idx_leagues_slug_key`, `idx_leagues_slug`, `leagues_slug_key` |
| `profiles` | `idx_profiles_player_id_key`, `idx_profiles_player_id`, `profiles_player_id_key`; `idx_profiles_whatsapp_key`, `profiles_whatsapp_key` |
| `matches` | `idx_matches_event_idx`, `idx_matches_event_live`, `idx_matches_event_starts`, `idx_matches_event_order`, `idx_matches_live_idx`, `idx_matches_live_updated` (tumpang-tindih) |
| `comp_team_players`, `coaching_*`, `gen_rounds`, `league_volumes`, `venues` | pasangan `idx_…_key` + `…_key` |

Ada dua sumber index (`scripts/db.mjs indexes` dan `optimize-mongo-indexes.mjs`) dengan nama berbeda untuk kunci yang sama. Perlu satu sumber kebenaran.

### 6.5 Index yang direkomendasikan (kandidat, belum dibuat)

| Koleksi | Index | Melayani |
|---|---|---|
| `players` | `{active:1, gender:1, points:-1, name:1}` | leaderboard, Home top-3, rank (`countDocuments`) |
| `players` | `{active:1, name:1}` | dropdown pemain di admin |
| `events` | `{published:1, event_date:-1, created_at:-1}` | `/jadwal` |
| `events` | `{published:1, status:1, event_date:1}` | Home "next event" |
| `admin_users`, `profiles` | `{user_id:1}` **non-partial** | auth lookup & middleware proxy |
| `push_subscriptions` | `{userId:1}`, `{email:1}` | pengiriman Web Push notifikasi user |
| `coaching_assessments` | `{player_id:1, status:1}` | profil/akun |
| `comp_score_log` | `{event_id:1, created_at:-1}` | admin event |
| `comp_team_players` | `{event_id:1, slot:1}` | `loadCompetition` |
| `matches` | `{event_id:1, starts_at:1, bracket_pos:1}` | `loadCompetition`, jadwal |
| `class_reviews` | `{class_id:1, hidden:1, created_at:-1}` | detail kelas |
| `class_participants` | `{class_id:1, payment_status:1}`, `{schedule_id:1}` | kelas |
| (bersihkan) | drop duplikat §6.4 | — |

Catatan: ada pula index pada **koleksi yang belum ada** di `optimize-mongo-indexes.mjs` (mis. `push_subscriptions`, `class_*`, `comp_score_log`, `event_transactions`, `point_presets`, `coaches`, `coaching_groups`, `coaching_skills`, `gen_events`, `gen_matches`). Beberapa koleksi sudah punya index lewat skrip lain; pastikan skrip utama menjadi sumber tunggal.

### 6.6 🔴 Latensi Regional: Vercel Functions vs MongoDB Atlas (Pajak Lintas-Benua ~220ms)

- Hasil audit DNS dan IP `basecamppadel.41v3awm.mongodb.net`:
  - Shard: `ac-i4kpog8-shard-00-00.41v3awm.mongodb.net` -> IP `159.143.60.32`
  - Lokasi: **Singapore (`ap-southeast-1`)**
- Di sisi lain, proyek Vercel yang dibuat secara default tanpa konfigurasi `vercel.json` akan mengeksekusi Serverless Functions di region **`iad1` (Washington D.C. / Virginia, US East)**.
- **Konsekuensi:**
  - Round-trip time (RTT) fisik fiber optik bawah laut antara US East dan Singapore adalah **±200ms – 250ms per round-trip**.
  - Jika suatu halaman melakukan 5 round-trip serial ke database, halaman tersebut menghabiskan **1.000ms – 1.250ms hanya untuk menunggu sinyal bolak-balik melintasi Samudra Pasifik**, bahkan sebelum data selesai diproses!
  - Ditambah dengan koneksi TLS handshake baru pada cold start serverless.
- **Solusi Paling Berdampak:**
  - Pastikan region Vercel Function disetel ke **`sin1` (Singapore)** di Project Settings Vercel (`Settings -> Functions -> Region`) atau via `vercel.json` (`"regions": ["sin1"]`).
  - Ini memotong latensi per query dari ~220ms menjadi **< 3ms**. Untuk halaman dengan 5–10 query, ini langsung menghemat **1–2 detik TTFB gratis** tanpa mengubah kode apa pun!

---

## 7. Aset & bundle

### 7.1 Gambar (`public/` = 11 MB)

| Aset | Ukuran Awal | Ukuran Terkini | Pemakaian | Status |
|---|---|---|---|---|
| `images/hero.jpg` | **1,42 MB** (4800x3200) | **307 KB** (1920x1280) | Home hero, `priority` | ✅ Tersolve: di-resize & kompres (turun 78%), `unoptimized` dicopot agar diproses image optimizer |
| `images/cover.jpg` | 1,42 MB | — | tak terlihat dipakai (perlu verifikasi) | Identik ukuran dengan `hero.jpg` → kemungkinan duplikat |
| `images/community.webp` | **1,17 MB** (4800x3200) | **104 KB** (1600x1067) | Home | ✅ Tersolve: di-resize & kompres (turun 91%), `unoptimized` dicopot |
| `images/bg.webp` | 1,17 MB | — | tak terlihat dipakai (perlu verifikasi) | Identik ukuran dengan `community.webp` → duplikat |
| `images/classes/*.jpg` | 2,8 MB (3 file ≈ 0,85–1 MB) | — | kelas | Besar |
| `images/players/*.png` | 1,9 MB (7 file, 170–380 KB) | — | avatar mock | PNG besar untuk avatar 24–80 px |
| `sponsors/*` | 456 KB | — | — | 3 file ±110–210 KB |

`unoptimized` pada `src/app/page.tsx` sudah dilepas untuk `hero.jpg` dan `community.webp`. Khusus `PlayerAvatar`: **semua foto pemain** (R2/Google) dilayani ukuran asli ke avatar 24–80 px; tidak ada langkah resize saat unggah (`lib/accountPhoto.ts` hanya memeriksa `file.size`). Di Leaderboard ini berarti puluhan foto penuh dimuat sekaligus.

`next.config.ts` sudah menyiapkan `images.remotePatterns` (R2, Supabase lama, ytimg), jadi optimasi bawaan Next bisa dinyalakan tanpa konfigurasi tambahan; `*.supabase.co` masih terdaftar padahal sudah migrasi (hygiene).

### 7.2 JavaScript

- 102 file `"use client"`. Banyak halaman publik (Jadwal, Leaderboard, detail event 489 baris `PlayoffBracket`) bertumpu pada client component besar.
- ✅ **Dynamic Import `xlsx` (Tersolve):** `xlsx@0.18` sebelumnya di-import statis di `src/lib/coaching-excel.ts` (menambah bundle admin coaching hingga ~800KB). Kini telah dikonversi menjadi dynamic import `await import("xlsx")` yang hanya di-download ke browser saat user mengklik ekspor atau mengunggah file template Excel di modal coaching.
- `PwaInstallPrompt` + `PushNotifPermission` (±420 baris) dimuat di **root layout** untuk semua halaman, namun kini telah di-guard agar tidak dieksekusi/dirender di route live overlay OBS `/overlay`.
- Service worker `public/sw.js`: handler `fetch` memakai pola "network-first" **tanpa pernah menulis cache** (`CACHE_NAME` tak terpakai) — setiap GET melewati SW tanpa manfaat offline/caching, hanya menambah overhead. Perlu diputuskan: jadikan caching aset statis sungguhan atau hapus handler `fetch`.
- Font: `inter` 4 bobot + `space-grotesk` 2 bobot woff2 (308 KB di `src/fonts` termasuk file `.woff` yang tidak terpakai) — wajar; pertimbangkan `preload` hanya bobot kritis.

### 7.3 🟠 Core Web Vitals (CLS & INP Risks)

1. **Cumulative Layout Shift (CLS):**
   - **Live Card Swap (`LiveCard.tsx`):** Jika SSR merender fallback mock match ("Rayhan / Andra"), lalu setelah hidrasi `usePolledLiveMatches` menemukan match riil (atau sebaliknya: tidak ada live lalu card menghilang), tinggi komponen melompat drastis di viewport atas Home.
   - **Root Layout Modals (`PwaInstallPrompt` & `PushNotifPermission`):** Injeksi modal install prompt muncul 1.2 detik setelah halaman tampil di bagian bawah layar. Di layar mobile, ini dapat mendorong elemen fixed / bottom bar jika tidak di-posisikan secara fixed absolut dengan benar.
   - **Font Swap (`display: "swap"`):** Perbedaan metrik bounding box antara fallback sans-serif sistem dan `Space Grotesk` (huruf judul besar `text-[48px]..[64px]`) dapat memicu layout shift vertikal saat font lokal dimuat.
2. **Interaction to Next Paint (INP):**
   - **Search Leaderboard:** Memfilter ratusan baris secara serentak di `onChange` tanpa `useDeferredValue` atau `useTransition`. Saat user mengetik cepat, main thread memblokir rendering input.
   - **Tab Event Detail:** Pergantian tab (Info -> Playoff Bracket 489 baris) merender pohon SVG/DOM besar secara synchronous.

### 7.4 🔴 [BARU] Temuan Audit Tambahan dari Fitur Mutakhir (PWA, Notifikasi, & Role Scoping)

#### 7.4.1 🔴 Koleksi `push_subscriptions` Tanpa Index (`COLLSCAN`)
- **File:** `src/lib/webpush.ts` L122–150.
- **Masalah:** Fungsi `sendPushToUser` memfilter user berdasarkan `{ userId }` dan regex `{ email }`. Namun, koleksi `push_subscriptions` belum terdaftar di `scripts/optimize-mongo-indexes.mjs` maupun `scripts/db.mjs`.
- **Dampak:** Setiap notifikasi push ke akun pemain (mis. notifikasi rapor coaching, pengingat jadwal, broadcast skor) melakukan full collection scan (`COLLSCAN`).
- **Rekomendasi:** Tambahkan index `{ userId: 1 }` dan `{ email: 1 }` pada koleksi `push_subscriptions`.

#### 7.4.2 🔴 Triple-Hop Redundant Query `admin_users` per Halaman Admin
- **File:** `src/proxy.ts` L23–27, `src/app/admin/layout.tsx` L28, `src/app/admin/**/page.tsx` (mis. `admin/coaching/page.tsx`).
- **Masalah:** Fitur role-scoped login (`DEV-657`) menyebabkan pengecekan hak akses dijalankan di 3 lapis berbeda dalam satu request:
  1. Middleware `proxy.ts`: query `admin_users.findOne({ $or: [{ _id }, { user_id }] })`.
  2. `AdminLayout`: memanggil `getAdminUser()` yang query lagi ke `admin_users`.
  3. Komponen halaman (Page): memanggil `requireAdminOrCoach()` / `requireScoreKeeperOrAdmin()` yang memanggil `getAdminUser()` untuk ketiga kalinya.
- **Dampak:** Karena index partial `user_id` di `admin_users` mengalami COLLSCAN (§6.3) dan tidak ada deduplikasi request via React `cache()`, satu navigasi admin memicu **3 round-trip serial identik ke database**.
- **Rekomendasi:** Buat index non-partial `{ user_id: 1 }` di `admin_users`, dan bungkus `getAdminUser()` dengan React `cache()` agar di-deduplicate dalam satu siklus request.

#### 7.4.3 🟠 Dobel HTTP Hop & Eksekusi Serial Notifikasi Kirimdev / Brevo
- **File:** `src/lib/server/kirimdev.ts` L111, `src/app/admin/coaching/actions.ts` L725–775.
- **Masalah:**
  1. `sendKirimdevWhatsAppMessage` memanggil `resolveKirimdevPhoneNumberId()` setiap kali mengirim pesan jika `KIRIMDEV_PHONE_NUMBER_ID` tidak diset di env, memicu HTTP call tambahan ke `https://api.kirimdev.com/v1/accounts?status=connected`.
  2. Pengiriman multi-channel (WhatsApp Kirimdev + Email Brevo + Mongo `loadNextCoachingSession`) dijalankan secara serial berurutan di dalam server action.
- **Dampak:** Modal kirim rapor coaching terasa lambat (loading 2–4 detik) karena menunggu antrean HTTP request eksternal secara berantai.
- **Rekomendasi:** Cache `resolvedPhoneId` di memori modul setelah pemanggilan pertama, dan jalankan pengiriman pesan multi-channel (WA, Email, PWA) secara paralel (`Promise.allSettled`).

#### 7.4.4 🟠 Service Worker `sw.js` Fetch Interceptor Tanpa Cache Store
- **File:** `public/sw.js` L12–18.
- **Masalah:** Event listener `fetch` mencegat setiap request HTTP browser dan me-relay `fetch(event.request).catch(() => caches.match(event.request))`, namun `CACHE_NAME` **tidak pernah ditulis (`cache.put`)**.
- **Dampak:** Setiap asset gambar, script, font, dan page di browser harus melalui IPC process Service Worker tanpa ada satupun cache hit, hanya menambah overhead runtime browser.
- **Rekomendasi:** Terapkan caching aset statis terukur (font, logo) di SW, atau buang fetch interceptor kosong tersebut bila hanya membutuhkan Web Push notification.

#### 7.4.5 🟡 PWA Install Prompt & Push Permission Di-Inject ke Layar Siaran OBS `/overlay`
- **File:** `src/app/layout.tsx` L51–52.
- **Masalah:** `<PwaInstallPrompt />` dan `<PushNotifPermission />` di-mount di Root Layout, sehingga ikut termuat di halaman `/overlay` yang digunakan oleh software broadcast OBS Studio untuk overlay skor live.
- **Dampak:** Komponen client dan timer dijalankan pada software siaran yang murni hanya membutuhkan render DOM grafis skor tanpa popup interaktif.
- **Rekomendasi:** Batasi rendering PWA prompt agar di-bypass jika pathname diawali `/overlay`.

---

## 8. Rekomendasi terhadap 4 poin Anda

### 8.1 "Load page dulu baru fetch" (streaming)

Sudah disepakati: **streaming server-side**, semua halaman.

1. Pindahkan shell ke `app/(public)/layout.tsx` agar Nav tetap dan `loading.tsx` hanya skeleton konten (§3.4).
2. Pecah halaman jadi komponen async yang masing-masing `await` datanya di dalam `<Suspense fallback={<Skeleton/>}>`. Contoh Home: Hero (statis, langsung tampil) → `<LiveSection/>` → `<NextEventSection/>` → `<TopLeaderboardSection/>` masing-masing independen, tidak saling menunggu.
3. Mulai request secara paralel (hindari waterfall: `getNextUpcomingEvent` 3 tahap, `getPlayerWithHistory`).
4. Panduan Next: `node_modules/next/dist/docs/01-app/02-guides/streaming.md` dan `…/03-file-conventions/loading.md`.

### 8.2 Caching (riset)

Fakta penting dari kode: admin **sudah** me-`revalidatePath` di banyak aksi, `/kelas` & `/liga` **sudah statis dan ter-invalidate**. Jadi strategi paling kompatibel:

| Data | Strategi | Invalidasi |
|---|---|---|
| Leaderboard, top-3 Home | cache data (tag `leaderboard`) | `revalidateTag("leaderboard")` di titik yang sudah memanggil `revalidatePath("/leaderboard")` (`match-actions.ts` L189, `mabar-actions.ts` L423/453) |
| Daftar event `/jadwal`, next event Home | tag `events` (TTL pendek, mis. 30–60 dtk, sebagai pengaman) | `revalidateEvent()` di `admin/events/_shared.ts` — satu titik pusat, mudah |
| Detail event `finished` | cache panjang | tag `event:<id>` |
| Detail event `live`/`open` | TTL 5–10 dtk atau tak di-cache | tag `event:<id>` |
| `/kelas/[slug]`, `/liga/[slug]` | statis + `generateStaticParams` | `revalidatePath` yang sudah ada |
| Live match, overlay, admin, akun | **tidak di-cache** | — |

Pilihan mekanisme (butuh keputusan): `unstable_cache` (sudah ditandai digantikan) **atau** `use cache` + `cacheTag`/`cacheLife` yang mensyaratkan `cacheComponents: true` di `next.config.ts` (mengubah semantik halaman dinamis — lihat `migrating-to-cache-components.md`). Disarankan prototipe `use cache` di satu halaman (Leaderboard) dahulu. Dokumen acuan: `caching-without-cache-components.md`, `use-cache.md`, `cacheTag.md`, `cacheLife.md`.

Hal lain di luar Next: header `Cache-Control` pada `/api/live/match?matchId=…`, dan CDN (Vercel/Cloudflare) untuk aset `public/`.

### 8.3 Pagination leaderboard / performa query

Sesuai keputusan: top-3 per gender + "Muat lebih banyak" 20/baris, rank di DB, search server-side.

- Index `{active, gender, points:-1, name:1}` (§6.5) membuat `find().sort().skip().limit()` dan `countDocuments` murni IXSCAN.
- Hindari jalur `sortInMemory` adapter (§2.2): tulis query langsung dengan `getDb()` atau beri `nullsFirst` eksplisit.
- Untuk daftar panjang lain: `/jadwal` (past events), `/admin/players`, `/admin/events` (pindahkan `slice` ke DB).
- Gunakan `projection` (kolom yang dibutuhkan saja), terutama untuk `players` yang memuat teks/foto.

### 8.4 Indexing di semua koleksi

Sesuai keputusan: audit → tambah hanya yang perlu. Hasil audit ada di §6. Urutan kerja yang aman:

1. Satukan sumber index (`scripts/db.mjs` vs `optimize-mongo-indexes.mjs`), buang duplikat §6.4 (DEV dulu).
2. Tambah index §6.5 di DEV, ulangi `explain()` (skrip audit tersedia, bisa dijalankan ulang).
3. Setelah konfirmasi Anda: PROD (`--confirm-prod`). Buat index di PROD saat trafik rendah (`createIndex` di Atlas non-blocking, tapi tetap memakai IO).

---

## 9. Baseline yang perlu diukur sebelum/ sesudah perbaikan

Agar klaim perbaikan terbukti, ukur dulu (tanpa mengubah kode):

| Metrik | Cara | Target |
|---|---|---|
| TTFB tiap route publik (`/`, `/jadwal`, `/jadwal/[id]`, `/leaderboard`, `/leaderboard/[id]`) | `curl -w "%{time_starttransfer}"` pada build `next start` | Catat p50/p95 |
| Jumlah query per halaman | Aktifkan `monitorCommands: true` pada `MongoClient` (sementara) atau profiler Atlas | Home ≤ 3, jadwal/[id] ≤ 10 |
| LCP & TBT mobile | Lighthouse (Moto G Power, 4G lambat) | LCP < 2,5 dtk |
| Ukuran JS First Load per route | `next build` (di folder terpisah / `distDir` lain agar tak menimpa dev) + `@next/bundle-analyzer` | Cek `xlsx` & client component besar |
| Beban polling | Log `/api/live/match` per menit saat 1 tab Home + 1 overlay terbuka | — |
| Ukuran data PROD | `estimatedDocumentCount` baca-saja per koleksi | Menentukan prioritas pagination vs index |

---

## 10. Roadmap prioritas (usulan, satu PR sesuai keputusan, dikerjakan berurutan)

| Urutan | Pekerjaan | Usaha | Dampak |
|---|---|---|---|
| 1 | Bungkus loader dengan `cache()` (dedupe `generateMetadata`/page) | Kecil | 🔴 turun ×2–×4 query di 4 route detail |
| 2 | Index: bersihkan duplikat + tambah §6.5 (DEV → konfirmasi → PROD) | Kecil–sedang | 🟠 kesiapan skala, hilangkan COLLSCAN auth |
| 3 | Top-3 / rank via query langsung + pagination leaderboard (server-side + search) | Sedang | 🔴 |
| 4 | Pindahkan `PublicShell` ke `(public)/layout.tsx`; buang fetch `/api/auth/me` per navigasi | Sedang | 🔴 |
| 5 | Streaming: `Suspense` per section (Home, Jadwal, Leaderboard, Detail) | Sedang | 🔴 (terasa cepat) |
| 6 | Caching data + `revalidateTag` di titik admin yang ada | Sedang | 🔴 |
| 7 | Gambar: kompres hero/community/classes, hapus `unoptimized` yang tidak perlu, resize foto saat unggah | Sedang | 🔴 LCP |
| 8 | `EventRealtime`: ganti `router.refresh()` 5 dtk dengan pengecekan versi ringan + pause saat tab tersembunyi | Kecil | 🔴 beban DB admin |
| 9 | Polling live: pause saat hidden, interval adaptif, `Cache-Control` cabang `matchId` | Kecil | 🟠 |
| 10 | `getEvents`/`getPublicClasses`/`getAdminClasses` → `aggregate` | Sedang | 🟠 |
| 11 | Lazy-load `xlsx`; tinjau SW `fetch` handler; pindahkan prompt PWA keluar dari layout overlay | Kecil | 🟠 |
| 12 | Hygiene: data mock, teks hardcoded `/kelas`, `*.supabase.co`, `/akun-demo`, aset duplikat | Kecil | 🟡 |

---

## Lampiran C — Tambahan (27 Okt 2026, 16:00): ukuran PROD & temuan mekanisme cache

> Semua dilakukan **baca-saja**. Tidak ada kode, index, atau data yang diubah.

### C.1 Ukuran data PROD (`estimatedDocumentCount`)

| Koleksi | Dokumen | Koleksi | Dokumen |
|---|---:|---|---:|
| `players` | **231** | `coaching_assessments` | 157 |
| `match_history` | 268 | `coaching_session_players` | 168 |
| `matches` | 110 | `auth_users` / `auth_identities` | 80 / 80 |
| `profiles` | 75 | `gen_participants` | 55 |
| `player_awards` | 49 | `gen_matches` | 58 |
| `comp_team_players` | 32 | `comp_score_log` | 33 |
| `events` | 7 | `leagues` / `league_volumes` | 1 / 3 |
| `classes` | **0** | `admin_users` | 1 |

Kesimpulan yang mengubah prioritas:

1. **PROD ± 9× lebih besar dari DEV untuk pemain** (231 vs 26), tapi masih kecil untuk MongoDB. `COLLSCAN` + sort memori atas 231 dokumen masih milidetik di server; yang dominan tetap **jumlah round-trip ke Atlas** dan ukuran payload (231 dokumen `select("*")` dikirim ke browser tiap buka Leaderboard).
2. Karena itu urutan manfaat terbesar tetap: kurangi query & duplikasi (§3.2), streaming, cache, gambar. **Index adalah kesiapan skala, bukan penyelamat kecepatan hari ini.** Pagination leaderboard tetap berguna terutama untuk **ukuran payload & render client** (231 baris ×2 gender + foto).
3. `classes` di PROD **kosong** (0): `/kelas` statis saat ini hanya menampilkan daftar kosong; jadi temuan agregasi kelas (§3.5) belum terasa di PROD. Halaman `/kelas` memuat teks "29 kelas" dan "1.846 pemain" hardcoded yang bertentangan dengan data PROD.
4. `events` hanya 7 dan `admin_users` hanya 1 → temuan `getEvents()` O(E×T) dan lookup admin COLLSCAN belum terasa; skalanya baru jadi masalah bila event/anggota bertambah ribuan (tidak mendesak).
5. Hal yang **tetap nyata di PROD** karena tidak bergantung ukuran data: pekerjaan ganda metadata/page (×2–×4 query), shell yang remount + `/api/auth/me` tiap navigasi, `EventRealtime` 5 dtk, polling live, gambar 1,4 MB.

### C.2 Temuan dari dokumentasi Next 16 yang mengubah rekomendasi cache (§8.2)

Dibaca dari `node_modules/next/dist/docs` (sesuai instruksi `AGENTS.md`):

| Fakta | Sumber | Implikasi |
|---|---|---|
| `use cache` hanya jalan bila `cacheComponents: true` di `next.config.ts` | `use-cache.md` | Perlu mengaktifkan flag global. |
| Setelah flag aktif, route yang masih mengekspor `dynamic`, `revalidate`, atau `fetchCache` akan **error** | `migrating-to-cache-components.md` L76 | Semua halaman yang kini memakai `revalidate = 0` / `force-dynamic` (Home, jadwal, leaderboard, overlay, seluruh admin) harus dimigrasi sekaligus — **bukan eksperimen kecil**. |
| `use cache` default memakai **cache in-memory (LRU)**. Di **serverless**, entri "biasanya tidak bertahan antar request"; di self-host bertahan | `use-cache.md` L243–259 | `siteUrl` default proyek adalah `basecamppadel.vercel.app`. **Jika dideploy di Vercel (serverless), `use cache` bawaan nyaris tidak menghemat query runtime** kecuali memakai `use cache: remote` (butuh cache handler, mis. Redis/KV) — yang menambah infrastruktur. **(perlu dikonfirmasi: di mana PROD di-host?)** |
| Cache `use cache` **tidak terbawa antar deploy** (kunci memuat build ID) | `use-cache.md` L259 | Setiap deploy mengosongkan cache. |
| `unstable_cache` **bertahan antar request dan antar deploy** dan tetap berlaku untuk fungsi non-`fetch` seperti query Mongo; walau ditandai digantikan, dokumen sendiri menyarankannya untuk data yang harus persisten | `use-cache.md` L261, `unstable_cache.md` | Untuk proyek ini (query Mongo, kemungkinan Vercel) `unstable_cache` + `revalidateTag` adalah **jalur paling kecil risikonya**, tanpa flag global. |
| `revalidatePath` tidak berubah; `revalidateTag` kini mewajibkan argumen profil cache (mis. `'max'`) atau memakai `updateTag` | `migrating-to-cache-components.md` L440–446 | Titik admin yang sudah memanggil `revalidatePath` bisa ditambah pemanggilan tag dengan sintaks baru. |

**Rekomendasi cache (menggantikan butir di §8.2 bila bertentangan):**

- **Tahap 1 (risiko rendah):** React `cache()` untuk dedupe per-request (§3.2) + `unstable_cache` bertag untuk data semi-statis (leaderboard, daftar event, detail event selesai). Tidak mengubah `next.config.ts`, tidak memaksa migrasi seluruh halaman.
- **Tahap 2 (opsional, setelah ada ukuran nyata):** evaluasi `cacheComponents` + `use cache` **hanya jika** hosting self-host atau mau memakai `use cache: remote`. Ini migrasi besar (hapus semua segment config, ratusan halaman admin) dan baru layak bila Tahap 1 belum cukup.
- Cara "coba dulu" yang tidak mengubah apa-apa: ukur dulu baseline (§9), lalu bila disetujui, prototipe di **branch terpisah** untuk satu halaman (Leaderboard) dan bandingkan angkanya. Belum dikerjakan.

### C.3 Keputusan (dijawab 27 Okt 2026, 16:25)

| Pertanyaan | Jawaban | Konsekuensi |
|---|---|---|
| Hosting PROD | **Vercel** (serverless) | `use cache` bawaan (in-memory) **tidak efektif** untuk menghemat query runtime. Pakai `unstable_cache` (Data Cache Vercel, persisten antar request & deploy). `use cache: remote` hanya bila nanti butuh dan mau menambah infrastruktur. |
| Toleransi data basi | **Boleh tertunda beberapa detik** | TTL pendek sebagai pengaman sudah cukup; `revalidateTag` tetap dipakai agar perubahan admin tampil lebih cepat. Tidak perlu cache-bypass khusus untuk halaman publik. |

### C.4 Rencana cache final (masih rencana, belum dikerjakan)

| Data | Mekanisme | TTL pengaman | Tag |
|---|---|---|---|
| Leaderboard (top-3 Home, daftar per gender, rank) | `unstable_cache` | 30 dtk | `leaderboard` |
| Daftar event `/jadwal`, next event Home | `unstable_cache` | 30 dtk | `events` |
| Detail event `open`/`live` | `unstable_cache` | 5–10 dtk | `event:<id>` |
| Detail event `finished` | `unstable_cache` | 1 jam | `event:<id>` |
| Liga (`/liga/[slug]`), kelas (`/kelas/[slug]`) | statis + `revalidatePath` yang sudah ada | — | — |
| Live match, overlay, admin, akun | tanpa cache | — | — |

Catatan teknis untuk Vercel:

1. `unstable_cache` tidak boleh membaca `cookies()`/`headers()` di dalamnya (`unstable_cache.md`). Data ber-cookie di `/leaderboard/[playerId]` (coach notes, status admin) harus dipisah dari data publik.
2. Hasil cache harus serializable (Date jadi string); dokumen Mongo perlu dinormalisasi (adapter sudah memakai `normalizeDoc`).
3. Invalidasi: tambahkan pemanggilan tag di titik yang sudah ada (`admin/events/_shared.ts` → `revalidateEvent`, `match-actions.ts` L189, `mabar-actions.ts` L423/453). Sintaks `revalidateTag` di Next 16 mewajibkan argumen profil (mis. `'max'`) — periksa `revalidateTag.md` saat implementasi.
4. **Latensi region (belum diukur):** pada serverless, tiap cold start membuka koneksi baru ke Atlas, dan jarak region fungsi Vercel ↔ cluster Atlas langsung menambah tiap round-trip. Perlu dicek: region fungsi Vercel (Project Settings → Functions) harus sedekat mungkin dengan region cluster Atlas. Ini bisa lebih berdampak daripada optimasi query dan **tidak terlihat dari kode**. Tambahkan ke baseline §9.
5. Pool `maxPoolSize: 20` / `minPoolSize: 1` di `lib/mongodb.ts` dibuat untuk server panjang. Di serverless, banyak instance × pool 20 bisa menghabiskan batas koneksi Atlas (tier gratis/kecil). Tinjau (mis. turunkan `maxPoolSize`, atau `attachDatabasePool` dari Vercel bila tersedia). **(perlu verifikasi di dokumentasi Vercel/Atlas)**

### C.5 Pertanyaan terbuka

1. Region fungsi Vercel dan region cluster Atlas saat ini? (menentukan seberapa besar latensi dasar per query)
2. Tier Atlas apa (M0/M10, dst.)? (batas koneksi)


---

## Lampiran A — Skrip audit database

Query baca-saja yang dipakai untuk §6 (menghitung koleksi, `listIndexes`, `explain("executionStats")` untuk ±38 query panas) tersimpan di folder scratch percakapan ini dan dapat dijalankan ulang ke DEV setelah index diubah. Tidak ada tulis/ubah data. `explain()` hanya ke DEV; PROD hanya dihitung jumlah dokumennya (Lampiran C).

## Lampiran B — Daftar lengkap route yang ditinjau

**Publik**: `/`, `/jadwal`, `/jadwal/[id]`, `/leaderboard`, `/leaderboard/[playerId]`, `/kelas`, `/kelas/[slug]`, `/liga`, `/liga/[slug]`, `/masuk`, `/privasi`, `/syarat`, `/overlay`, `/akun`, `/akun/edit`, `/akun/lengkapi`, `/akun/sambungkan`, `/akun-demo`, `/akun-demo/edit`, `/akun-demo/lengkapi`, `/akun-demo/sambungkan`, `/not-found`.

**Admin**: `/admin`, `/admin/login`, `/admin/coaching`, `/admin/coaching/sessions/new`, `/admin/coaching/sessions/[id]`, `/admin/coaching/skills`, `/admin/events`, `/admin/events/new`, `/admin/events/[id]`, `/admin/generator`, `/admin/generator/[id]`, `/admin/kelas`, `/admin/kelas/new`, `/admin/kelas/[id]`, `/admin/kelas/[id]/edit`, `/admin/liga`, `/admin/liga/new`, `/admin/liga/[id]`, `/admin/liga/[id]/edit`, `/admin/live`, `/admin/live/quick`, `/admin/live/freeform/[id]`, `/admin/players`, `/admin/point`, `/admin/point/preset`, `/admin/points`, `/admin/points/preset`, `/admin/sessions`, `/admin/users/admin`, `/admin/users/coach`, `/admin/users/scorekeeper`, `/admin/venues`, `/admin/venues/[id]`.

**Route handler**: `/api/live/match`, `/api/matches/update`, `/api/auth/{login,me,signout,google,google/callback}`, `/api/push/{send,subscribe}`, `/api/admin/kelas/upload`, `/auth/{callback,signout}`, `/admin/coaching/rapor/[id]`, `/akun/rapor/[id]`, `/akun-demo/rapor/[id]`.

---

## Lampiran D — Update Verifikasi Lapangan & Status Kode (28 Okt 2026)

> Dilakukan pengecekan menyeluruh terhadap status branch `fix/performance` dan commit-commit mutakhir (PR #27, #28, #29).

### D.1 Status Implementasi Terkini (Branch `fix/performance`)
- **Hasil Implementasi:** 10 dari 17 temuan telah berhasil diselesaikan secara bertahap dalam 4 batch:
  - ✅ **Batch 1 (Quick Wins):** Bug invalidasi cache `_shared.ts` diperbaiki, React `cache()` dipasang di loader kritis (`getAdminUser`, `getEventByIdOrSlug`, dll), interval polling `EventRealtime` diperpanjang ke 15s + pause saat tab disembunyikan, dan prompt PWA di-bypass dari layar OBS `/overlay`.
  - ✅ **Batch 2 (DB Indexing & Query Architecture):** Index sparse non-partial dipasang pada `user_id` (`COLLSCAN` hilang), index `push_subscriptions` ditambahkan, komposit index `players` & `events` aktif, mutasi `recomputePlayerStats` N+1 di-rewrite jadi 2 pipeline aggregation + 1 `bulkWrite`, serta ranking profil & top-3 Home dihitung langsung di database tanpa memory scan.
  - ✅ **Batch 3 (Frontend Shell & Caching Layer):** Navigasi akun dioptimasi dengan in-memory cache dan promise deduplication pada `useAccountChip` (tidak ada lagi fetch berulang `/api/auth/me`), serta ISR (stale cache) diaktifkan pada halaman publik utama (`revalidate = 30` di Home & Jadwal Detail; `revalidate = 60` di Jadwal & Leaderboard).
  - ✅ **Batch 4 (Aset & Media):** `hero.jpg` dan `community.webp` dikompres (turun 78% & 91%) dan `unoptimized` dilepas; modul besar `xlsx` (~800KB) dikonversi ke lazy dynamic import `await import("xlsx")` pada admin coaching.
  - 📋 **Panduan Region Vercel:** Dokumentasi setup region Vercel Hobby ke `sin1` telah dibuat di `docs/vercel-region-setup.md`.

### D.2 Verifikasi 5 Temuan Tambahan Baru
1. **`push_subscriptions` COLLSCAN:** ✅ Tersolve. Index `userId` dan `email` telah didaftarkan dan dijalankan via `scripts/optimize-mongo-indexes.mjs`.
2. **Triple-hop `admin_users`:** ✅ Tersolve. `getAdminUser()` telah dibungkus dengan React `cache()`.
3. **Kirimdev Extra HTTP Round-trip:** Terverifikasi pada `src/lib/server/kirimdev.ts`. Jika `KIRIMDEV_PHONE_NUMBER_ID` tidak diset di env, sistem melakukan `fetch` ekstra ke `/v1/accounts` sebelum mengirim pesan. Selain itu, pengiriman multi-channel berjalan serial di action rapor coaching.
4. **Service Worker Interceptor Tanpa Cache:** Terverifikasi pada `public/sw.js`. Listener `fetch` mencegat semua request GET namun objek cache browser tidak pernah diisi (`cache.put`), membuang siklus CPU/IPC browser tanpa hasil.
5. **PWA Injeksi ke OBS `/overlay`:** ✅ Tersolve. Pathname guard `pathname?.startsWith("/overlay")` dipasang pada komponen prompt PWA.

### D.3 Status Pengerjaan (Batching PR `fix/performance`)

1. **✅ Batch 1 (Quick Wins Berdampak Masif — Selesai):**
   - [x] Siapkan panduan Vercel Singapore `sin1` di `docs/vercel-region-setup.md`.
   - [x] Perbaiki bug route `revalidatePath("/jadwal/[id]", "page")` di `_shared.ts`.
   - [x] Bungkus loader metadata & page dengan React `cache()`, termasuk `getAdminUser()`.
   - [x] Pasang index non-partial `{ user_id: 1 }` di `admin_users` dan index `{ userId: 1, email: 1 }` di `push_subscriptions`.
   - [x] Turunkan interval / pause `EventRealtime` 5 detik ➔ 15 detik + listener `visibilitychange`.
   - [x] Bypass komponen PWA jika path adalah `/overlay`.
2. **✅ Batch 2 (Database Indexing & Query Optimization — Selesai):**
   - [x] Tambahkan index komposit `{ active: 1, gender: 1, points: -1, name: 1 }` pada `players`.
   - [x] Perbaiki query rank menjadi `countDocuments` di DB (menghilangkan O(N) memory rank).
   - [x] Ubah `recomputePlayerStats` N+1 serial loop menjadi batch aggregation / bulk write.
3. **✅ Batch 3 (Frontend Shell & Caching Layer — Selesai):**
   - [x] In-memory cache & fetch promise deduplication pada `useAccountChip` (hilangkan request `/api/auth/me` tiap navigasi).
   - [x] Pasang `export const revalidate = 30` / `60` pada halaman publik (Home, Jadwal, Leaderboard).
4. **✅ Batch 4 (Aset & Media — Selesai):**
   - [x] Kompres `hero.jpg` (1,4MB ➔ 307KB) & `community.webp` (1,17MB ➔ 104KB), buang `unoptimized`.
   - [x] Lazy load `xlsx` di modal coaching via dynamic `import("xlsx")`.
5. **Sisa Temuan untuk Siklus Berikutnya (Opsional / Terpisah):**
   - [ ] Optimasi `sw.js` (hapus fetch interceptor kosong atau pasang cache statis sesungguhnya).
   - [ ] Paralelisasi pengiriman notifikasi Kirimdev / Brevo di `actions.ts`.
   - [ ] Polling live match background throttling.

