# 🔔 PWA Push Notification — Developer Reference

## File yang Dibuat

| File | Fungsi |
|---|---|
| `src/lib/webpush.ts` | Core helper: simpan subscription, kirim ke semua / per user |
| `src/app/api/push/subscribe/route.ts` | `POST /api/push/subscribe` — simpan subscription browser ke MongoDB |
| `src/app/api/push/send/route.ts` | `POST /api/push/send` — kirim notif (admin/scorekeeper only) |
| `src/components/pwa/PushNotifPermission.tsx` | Tombol "Aktifkan Notifikasi" di UI |
| `public/sw.js` | Service Worker (ditambah handler `push` & `notificationclick`) |

## Trigger yang Sudah Aktif

| Trigger | Di mana | Notif ke |
|---|---|---|
| Event baru dibuat | `createCompetition` action | Semua subscriber |
| Match go-live (`is_live=true`) | `/api/matches/update` route | Semua subscriber |

---

## 📌 Untuk Teman yang Handle Raport (Email/WA)

Saat raport selesai dan siap dikirim ke player, cukup tambahkan **1 baris** ini:

```ts
import { sendPushToUser } from "@/lib/webpush";

// Kirim ke user by userId (dari Supabase auth)
await sendPushToUser(
  { userId: player.user_id },  // atau { email: player.email }
  {
    title: "📊 Rapor Kamu Sudah Keluar!",
    body: `Lihat hasil penilaian sesi ${sessionTitle}`,
    url: `/akun`,
  }
).catch(() => {}); // non-blocking
```

> Fungsi `sendPushToUser` ada di `src/lib/webpush.ts`.
> Subscription dicocokkan by `userId` atau `email` yang tersimpan di MongoDB collection `push_subscriptions`.

### Contoh integrasi di `submitAssessmentAction`:

```ts
// Setelah assessment berhasil submitted & published_to_player=true:
if (data.publishedToPlayer) {
  sendPushToUser(
    { userId: data.playerId },
    {
      title: "📊 Rapor Padel Kamu Sudah Keluar!",
      body: "Tap untuk lihat hasil penilaian coach kamu",
      url: "/akun",
    }
  ).catch(() => {});
}
```

---

## ⚙️ Vercel Deployment — Cara Setting

### Langkah 1 — Buka Environment Variables

1. Buka [vercel.com/dashboard](https://vercel.com/dashboard)
2. Klik project **basecamppadel-website**
3. Klik tab **Settings** di navbar atas
4. Di sidebar kiri → klik **Environment Variables**

### Langkah 2 — Tambah 3 Variabel

Klik tombol **Add New** untuk setiap variabel berikut:

| Key | Value | Environment |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `BDcbajaXJ_CEFQ7O6IEC0ukL5fB0zy0R6eFkZ9p32NZbe_XYnaL4TH6j54TuwXwfHRYZzw6X3HMgyU5PgbZlSDw` | Production, Preview, Development |
| `VAPID_PRIVATE_KEY` | `trVoTTRYaADWofwFSUibGYxh5h9SdvOOtT2OnFwYgKQ` | Production, Preview, Development |
| `VAPID_EMAIL` | `mailto:admin@basecamppadel.com` | Production, Preview, Development |

> **Tips:** Centang ketiga environment agar push notif juga jalan di preview branch.

### Langkah 3 — Redeploy

Setelah variabel disimpan, Vercel **tidak otomatis redeploy**. Trigger deployment baru:

**Opsi A — Via Dashboard:**
1. Klik tab **Deployments**
2. Klik `...` di deployment terbaru → pilih **Redeploy**

**Opsi B — Via Git (lebih mudah):**
```bash
git commit --allow-empty -m "chore: trigger redeploy for VAPID env vars"
git push
```

### Langkah 4 — Verifikasi di Production

Setelah deploy selesai:
1. Buka URL production di browser
2. Buka **DevTools → Console** — pastikan tidak ada error `NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set`
3. Prompt "Aktifkan Notifikasi" muncul → klik **Aktifkan**
4. Browser minta izin → klik **Allow**
5. Cek **MongoDB Atlas** → collection `push_subscriptions` ada dokumen baru

> [!CAUTION]
> Jangan commit `VAPID_PRIVATE_KEY` ke git. Pastikan `.env.local` ada di `.gitignore`.

> [!WARNING]
> Kalau lupa redeploy setelah tambah env vars, push notif tidak akan jalan meski variabelnya sudah tersimpan di Vercel.

---

## MongoDB Collection

Collection `push_subscriptions` dibuat **otomatis** saat user pertama subscribe. Tidak perlu setup manual.

Schema tiap dokumen:
```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": { "p256dh": "...", "auth": "..." },
  "userId": "supabase-user-id-or-null",
  "email": "user@email.com-or-null",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```
