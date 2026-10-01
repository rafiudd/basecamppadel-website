# Panduan Integrasi Preset Poin untuk CRUD Event

Dokumentasi ini ditujukan sebagai panduan teknis saat mengimplementasikan fitur **Buat / Edit Event** (*Mabar* maupun *Kompetisi*) agar dapat terhubung dengan data preset poin leaderboard.

---

## 1. Skema Database & Relasi

### A. Tabel `public.point_presets`
Data preset tersimpan di Supabase dengan skema berikut:

| Kolom | Tipe Data | Keterangan |
|---|---|---|
| `id` | `UUID` (PK) | ID unik preset |
| `name` | `TEXT` | Nama preset (contoh: "Standar", "Turnamen besar", "Bulanan") |
| `is_default` | `BOOLEAN` | Penanda preset bawaan sistem |
| `rules` | `JSONB` | Berisi daftar kategori dan bobot poin (`mabar` & `kompetisi`) |
| `created_at` | `TIMESTAMPTZ` | Waktu dibuat |
| `updated_at` | `TIMESTAMPTZ` | Waktu terakhir diperbarui |

### B. Menghubungkan ke Tabel Event / Sessions
Saat membuat fitur Event, tambahkan foreign key `point_preset_id` ke tabel event Anda (misal `sessions` atau `gen_events`):

```sql
-- Tambahkan kolom point_preset_id:
alter table public.sessions 
add column if not exists point_preset_id uuid references public.point_presets(id) on delete set null;

-- Atau jika event generator (Americano/Mexicano):
alter table public.gen_events 
add column if not exists point_preset_id uuid references public.point_presets(id) on delete set null;
```

---

## 2. Struktur Data `rules` (JSONB)

Data aturan poin disimpan dalam kolom `rules` bertipe `JSONB` dengan format:

```typescript
import type { PointPreset, PointPresetRules, PointCategoryItem } from "@/lib/database.types";
```

Contoh payload `rules` di database:
```json
{
  "mabar": [
    { "id": "m1", "name": "Juara 1", "desc": "Posisi 1 klasemen akhir", "points": 30, "checked": true },
    { "id": "m2", "name": "Juara 2", "desc": "Posisi 2 klasemen akhir", "points": 20, "checked": true },
    { "id": "m3", "name": "Juara 3", "desc": "Posisi 3 klasemen akhir", "points": 10, "checked": true },
    { "id": "m4", "name": "Ikut serta", "desc": "Semua peserta lain yang main", "points": 5, "checked": true }
  ],
  "kompetisi": [
    { "id": "k1", "name": "Ikut fase grup", "desc": "Semua tim peserta", "points": 5, "checked": true },
    { "id": "k2", "name": "Lolos grup / 8 besar", "desc": "Masuk babak knockout", "points": 15, "checked": true },
    { "id": "k3", "name": "Semifinal", "desc": "Kalah di semifinal", "points": 30, "checked": true },
    { "id": "k4", "name": "Runner-up", "desc": "Kalah di final", "points": 50, "checked": true },
    { "id": "k5", "name": "Juara", "desc": "Menang final", "points": 80, "checked": true },
    { "id": "custom-123", "name": "MVP", "points": 20, "checked": true, "isCustom": true }
  ]
}
```

> **Catatan:** Hanya kategori yang dicentang saat pembuatan/pengeditan preset yang tersimpan di dalam array ini.

---

## 3. Mengambil Data Preset di Form Buat / Edit Event

Gunakan Server Action `getPointPresets()` dari `@/app/admin/point/actions`:

### Contoh pada Server Component (`page.tsx` Form Event):
```tsx
import { getPointPresets } from "@/app/admin/point/actions";
import { EventForm } from "@/components/admin/EventForm";

export default async function CreateEventPage() {
  const presets = await getPointPresets();

  return <EventForm presets={presets} />;
}
```

### Contoh pada Form Component (Dropdown Seleksi Preset):
```tsx
import Link from "next/link";
import type { PointPreset } from "@/lib/database.types";

export function EventPresetSelector({
  presets,
  selectedPresetId,
}: {
  presets: PointPreset[];
  selectedPresetId?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-snow/60 font-semibold">
          Preset Poin Leaderboard
        </span>
        <Link 
          href="/admin/point" 
          target="_blank" 
          className="text-xs text-volt hover:underline"
        >
          Atur preset di menu Poin ↗
        </Link>
      </div>

      <select
        name="point_preset_id"
        defaultValue={selectedPresetId ?? presets[0]?.id}
        className="field bg-ink-2 text-snow border border-snow/10 rounded-lg p-2.5 outline-none"
      >
        {presets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} {p.is_default ? "(Default)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
```

---

## 4. Logika Perhitungan & Pencocokan Poin Saat Event Selesai

Ketika event diselesaikan (*Finalize / Klasemen Akhir*), sistem mencocokkan peringkat atau babak yang dicapai pemain dengan kategori pada preset event tersebut.

Berikut contoh helper function yang dapat digunakan:

```typescript
import type { PointPresetRules } from "@/lib/database.types";

/**
 * Mencari poin Mabar berdasarkan posisi klasemen akhir (rank 1, 2, 3, dst.)
 */
export function getMabarPoints(rank: number, rules: PointPresetRules): number {
  const mabar = rules.mabar || [];

  if (rank === 1) {
    return Number(mabar.find((i) => i.id === "m1" || i.name.toLowerCase().includes("juara 1"))?.points ?? 0);
  }
  if (rank === 2) {
    return Number(mabar.find((i) => i.id === "m2" || i.name.toLowerCase().includes("juara 2"))?.points ?? 0);
  }
  if (rank === 3) {
    return Number(mabar.find((i) => i.id === "m3" || i.name.toLowerCase().includes("juara 3"))?.points ?? 0);
  }
  if (rank === 4) {
    const juara4 = mabar.find((i) => i.id === "m-juara4" || i.name.toLowerCase().includes("juara 4"));
    if (juara4) return Number(juara4.points);
  }

  // Peserta lain (Ikut serta)
  const ikutSerta = mabar.find((i) => i.id === "m4" || i.id === "m-ikut" || i.name.toLowerCase().includes("ikut"));
  return Number(ikutSerta?.points ?? 0);
}

/**
 * Mencari poin Kompetisi berdasarkan tahap tertinggi yang dicapai tim/pemain
 * @param stage 'juara' | 'runner_up' | 'semifinal' | '8_besar' | 'lolos_grup' | 'ikut_grup'
 */
export function getKompetisiPoints(stage: string, rules: PointPresetRules): number {
  const komp = rules.kompetisi || [];

  const map: Record<string, string> = {
    juara: "juara",
    runner_up: "runner-up",
    semifinal: "semifinal",
    "8_besar": "8 besar",
    lolos_grup: "lolos grup",
    ikut_grup: "ikut fase grup",
  };

  const keyword = map[stage] || stage;
  const match = komp.find((i) => i.name.toLowerCase().includes(keyword));
  return Number(match?.points ?? 0);
}
```

---

## 5. Sinkronisasi Otomatis ke Leaderboard

Sistem database Basecamp Padel sudah memiliki trigger database PostgreSQL bawaan:
- Setiap kali baris baru dimasukkan ke tabel `public.match_history` (dengan kolom `player_id`, `points_delta`, dan `result`), fungsi trigger **`recompute_player_stats`** di Supabase akan **secara otomatis mengakumulasikan total poin pemain di tabel `players` dan leaderboard publik**.

```typescript
// Contoh saat mendistribusikan poin event ke pemain di Server Action:
await supabase.from("match_history").insert({
  player_id: playerId,
  session_label: eventTitle,
  result: isWinner ? "W" : "L",
  points_delta: awardedPoints, // angka poin didapat dari helper perhitungan di atas
});
// Total poin di tabel `players` dan halaman `/leaderboard` otomatis terupdate seketika!
```
