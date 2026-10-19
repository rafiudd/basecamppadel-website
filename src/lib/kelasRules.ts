/**
 * Pure business logic rules for Kelas (Padel Academy / Clinic).
 * No runtime I/O, no node/browser specifics, runnable in node --test.
 */

export type ClassCategoryKey = "dasar" | "teknik" | "taktik" | "mf" | "khusus";

export interface CategoryInfo {
  key: ClassCategoryKey;
  label: string;
}

export const CLASS_CATEGORIES: CategoryInfo[] = [
  { key: "dasar", label: "Dasar" },
  { key: "teknik", label: "Teknik" },
  { key: "taktik", label: "Posisi & taktik" },
  { key: "mf", label: "Mental & fisik" },
  { key: "khusus", label: "Program khusus" },
];

export const CATEGORY_LABELS: Record<string, string> = {
  dasar: "Dasar",
  teknik: "Teknik",
  taktik: "Posisi & taktik",
  mf: "Mental & fisik",
  khusus: "Program khusus",
};

export const PIN_COLORS: Record<string, { bg: string; border: string }> = {
  Putih: { bg: "#FBF7F1", border: "1px solid rgba(23,21,31,0.35)" },
  Kuning: { bg: "#FFD43B", border: "none" },
  Biru: { bg: "#2563EB", border: "none" },
  Merah: { bg: "#DC2626", border: "none" },
  Hitam: { bg: "#17151F", border: "1px solid rgba(251,247,241,0.6)" },
};

export const ALL_PINS = ["Putih", "Kuning", "Biru", "Merah", "Hitam"] as const;

export type PinName = typeof ALL_PINS[number];

export type SortKey = "pop" | "rate" | "cheap" | "exp" | "new";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "pop", label: "Paling populer" },
  { key: "rate", label: "Rating tertinggi" },
  { key: "cheap", label: "Harga terendah" },
  { key: "exp", label: "Harga tertinggi" },
  { key: "new", label: "Terbaru" },
];

export interface ClassItemSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  suitablePins: string[];
  price: number;
  totalSessions: number;
  durationPerSession: number;
  capacity: number;
  isNew: boolean;
  sortOrder: number;
  totalParticipants?: number;
  averageRating?: number;
  totalReviews?: number;
}

export interface FilterParams {
  query?: string;
  category?: string;
  pin?: string;
  sort?: SortKey | string;
}

/** Format currency integer to Indonesian Rupiah */
export function formatRupiah(amount: number): string {
  if (amount == null || isNaN(amount)) return "Rp 0";
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}

/** Format pin text label (e.g. "Pin Putih & Kuning" or "Semua pin") */
export function formatPinText(pins: string[]): string {
  if (!pins || pins.length === 0) return "Semua pin";
  if (pins.length >= 5) return "Semua pin";
  if (pins.length === 1) return `Pin ${pins[0]}`;
  return `Pin ${pins.join(" & ")}`;
}

/** Check slot capacity and remaining slots */
export function checkSlotAvailability(capacity: number, registeredCount: number) {
  const cap = Math.max(1, capacity || 4);
  const reg = Math.max(0, registeredCount || 0);
  const remaining = Math.max(0, cap - reg);
  const isFull = remaining <= 0;
  const percentage = Math.min(100, Math.round((reg / cap) * 100));

  return {
    capacity: cap,
    registered: reg,
    remaining,
    isFull,
    percentage,
    label: `${reg}/${cap}`,
  };
}

/** Filter and sort classes list */
export function filterAndSortClasses<T extends ClassItemSummary>(
  items: T[],
  filters: FilterParams
): T[] {
  const q = (filters.query || "").trim().toLowerCase();
  const cat = filters.category || "all";
  const pin = filters.pin || "all";
  const sort = (filters.sort as SortKey) || "pop";

  const filtered = items.filter((item) => {
    // category filter
    if (cat !== "all" && item.category !== cat) {
      return false;
    }
    // pin filter
    if (pin !== "all" && (!item.suitablePins || !item.suitablePins.includes(pin))) {
      return false;
    }
    // search query filter
    if (q) {
      const matchTitle = (item.title || "").toLowerCase().includes(q);
      const matchDesc = (item.description || "").toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  // Sorting
  return filtered.sort((a, b) => {
    switch (sort) {
      case "rate":
        return (b.averageRating ?? 0) - (a.averageRating ?? 0) || (b.totalReviews ?? 0) - (a.totalReviews ?? 0);
      case "cheap":
        return a.price - b.price;
      case "exp":
        return b.price - a.price;
      case "new":
        if (b.isNew !== a.isNew) return b.isNew ? 1 : -1;
        return a.sortOrder - b.sortOrder;
      case "pop":
      default:
        return (b.totalParticipants ?? 0) - (a.totalParticipants ?? 0) || a.sortOrder - b.sortOrder;
    }
  });
}

export interface ReviewItem {
  rating: number;
}

/** Calculate average and 1-5 star distribution histogram */
export function calculateRatingSummary(reviews: ReviewItem[]) {
  if (!reviews || reviews.length === 0) {
    return {
      average: 0,
      averageFormatted: "0.0",
      total: 0,
      counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      percentages: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;

  for (const r of reviews) {
    const star = Math.max(1, Math.min(5, Math.round(r.rating)));
    counts[star] = (counts[star] || 0) + 1;
    sum += star;
  }

  const total = reviews.length;
  const average = Math.round((sum / total) * 10) / 10;
  const percentages: Record<number, number> = {};
  for (let s = 1; s <= 5; s++) {
    percentages[s] = Math.round((counts[s] / total) * 100);
  }

  return {
    average,
    averageFormatted: average.toFixed(1),
    total,
    counts,
    percentages,
  };
}

/** Generate WhatsApp booking message URL */
export function generateWhatsAppBookingUrl(
  waNumber: string,
  classTitle: string,
  scheduleLabel?: string
): string {
  const cleanNumber = waNumber.replace(/[^0-9]/g, "");
  let msg = `Halo Basecamp Padel, saya mau tanya/daftar kelas *${classTitle}*`;
  if (scheduleLabel) {
    msg += ` untuk jadwal *${scheduleLabel}*`;
  }
  msg += ". Mohon info ketersediaan slotnya ya. Terima kasih!";
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`;
}

/** Generate WhatsApp reminder message URL for admin/coach */
export function generateWhatsAppReminderUrl(
  phone: string,
  participantName: string,
  classTitle: string,
  dateLabel: string,
  timeRange: string,
  venueName?: string
): string {
  let cleanNumber = phone.replace(/[^0-9]/g, "");
  if (cleanNumber.startsWith("0")) {
    cleanNumber = "62" + cleanNumber.slice(1);
  }
  const venue = venueName ? ` di *${venueName}*` : "";
  const msg = `Halo ${participantName}, pengingat kelas *${classTitle}* di Basecamp Padel sesi berikutnya akan dimulai pada *${dateLabel}* pukul *${timeRange}*${venue}. Mohon hadir 10 menit sebelum kelas dimulai. Sampai ketemu di court! 🎾`;
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`;
}
