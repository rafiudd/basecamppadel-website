import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatRupiah,
  formatPinText,
  checkSlotAvailability,
  filterAndSortClasses,
  calculateRatingSummary,
  generateWhatsAppBookingUrl,
  generateWhatsAppReminderUrl,
} from "../src/lib/kelasRules.ts";

test("formatRupiah: format angka rupiah dengan pemisah ribuan", () => {
  assert.equal(formatRupiah(150000), "Rp 150.000");
  assert.equal(formatRupiah(300000), "Rp 300.000");
  assert.equal(formatRupiah(0), "Rp 0");
  assert.equal(formatRupiah(null), "Rp 0");
});

test("formatPinText: format label warna pin", () => {
  assert.equal(formatPinText(["Putih"]), "Pin Putih");
  assert.equal(formatPinText(["Putih", "Kuning"]), "Pin Putih & Kuning");
  assert.equal(formatPinText(["Putih", "Kuning", "Biru"]), "Pin Putih & Kuning & Biru");
  assert.equal(formatPinText(["Putih", "Kuning", "Biru", "Merah", "Hitam"]), "Semua pin");
  assert.equal(formatPinText([]), "Semua pin");
});

test("checkSlotAvailability: hitung sisa slot dan status penuh", () => {
  const s1 = checkSlotAvailability(4, 2);
  assert.equal(s1.remaining, 2);
  assert.equal(s1.isFull, false);
  assert.equal(s1.percentage, 50);
  assert.equal(s1.label, "2/4");

  const s2 = checkSlotAvailability(4, 4);
  assert.equal(s2.remaining, 0);
  assert.equal(s2.isFull, true);
  assert.equal(s2.percentage, 100);
  assert.equal(s2.label, "4/4");

  const s3 = checkSlotAvailability(6, 0);
  assert.equal(s3.remaining, 6);
  assert.equal(s3.isFull, false);
  assert.equal(s3.percentage, 0);
  assert.equal(s3.label, "0/6");
});

test("filterAndSortClasses: filter kategori, pin, kata kunci dan urutan", () => {
  const dummy = [
    {
      id: "1",
      slug: "firstimer",
      title: "Padel for Firstimer",
      description: "Baru pertama pegang raket",
      category: "dasar",
      suitablePins: ["Putih"],
      price: 150000,
      totalSessions: 1,
      durationPerSession: 90,
      capacity: 4,
      isNew: false,
      sortOrder: 0,
      totalParticipants: 200,
      averageRating: 4.9,
      totalReviews: 50,
    },
    {
      id: "2",
      slug: "backglass",
      title: "Mastering Backglass",
      description: "Berhenti panik di kaca belakang",
      category: "teknik",
      suitablePins: ["Kuning", "Biru"],
      price: 300000,
      totalSessions: 2,
      durationPerSession: 90,
      capacity: 4,
      isNew: false,
      sortOrder: 1,
      totalParticipants: 80,
      averageRating: 4.8,
      totalReviews: 30,
    },
    {
      id: "3",
      slug: "smash",
      title: "Smash x3 & Rulo",
      description: "Pukulan smash power keluar court",
      category: "teknik",
      suitablePins: ["Hitam"],
      price: 400000,
      totalSessions: 2,
      durationPerSession: 90,
      capacity: 4,
      isNew: true,
      sortOrder: 2,
      totalParticipants: 10,
      averageRating: 4.7,
      totalReviews: 5,
    },
  ];

  // Search keyword
  const byKeyword = filterAndSortClasses(dummy, { query: "kaca" });
  assert.equal(byKeyword.length, 1);
  assert.equal(byKeyword[0].slug, "backglass");

  // Category
  const byCat = filterAndSortClasses(dummy, { category: "teknik" });
  assert.equal(byCat.length, 2);

  // Pin
  const byPin = filterAndSortClasses(dummy, { pin: "Biru" });
  assert.equal(byPin.length, 1);
  assert.equal(byPin[0].slug, "backglass");

  // Sorting cheap
  const sortedCheap = filterAndSortClasses(dummy, { sort: "cheap" });
  assert.equal(sortedCheap[0].slug, "firstimer");
  assert.equal(sortedCheap[2].slug, "smash");

  // Sorting exp
  const sortedExp = filterAndSortClasses(dummy, { sort: "exp" });
  assert.equal(sortedExp[0].slug, "smash");
  assert.equal(sortedExp[2].slug, "firstimer");
});

test("calculateRatingSummary: hitung rata-rata dan histogram bintang", () => {
  const reviews = [
    { rating: 5 },
    { rating: 5 },
    { rating: 5 },
    { rating: 4 },
  ];

  const res = calculateRatingSummary(reviews);
  assert.equal(res.total, 4);
  assert.equal(res.average, 4.8);
  assert.equal(res.averageFormatted, "4.8");
  assert.equal(res.counts[5], 3);
  assert.equal(res.counts[4], 1);
  assert.equal(res.percentages[5], 75);
  assert.equal(res.percentages[4], 25);
});

test("generateWhatsAppBookingUrl & Reminder: format url wa dengan teks aman", () => {
  const bookUrl = generateWhatsAppBookingUrl("08123456789", "Mastering Backglass", "Sab, 31 Okt");
  assert.ok(bookUrl.includes("wa.me/08123456789"));
  assert.ok(bookUrl.includes("Mastering%20Backglass"));

  const remUrl = generateWhatsAppReminderUrl("08123456789", "Sari", "Mastering Backglass", "Sabtu, 31 Okt", "09.00", "East Padel");
  assert.ok(remUrl.includes("wa.me/628123456789"));
  assert.ok(remUrl.includes("Sari"));
});
