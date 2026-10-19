// Run: npm test  (node --test with TypeScript type stripping)
import { test } from "node:test";
import assert from "node:assert/strict";
import { addHoursHHMM, eventDurationHours, eventPrice } from "../src/lib/format.ts";

test("harga event: price_amount dulu, lalu price, tanpa harga karangan", () => {
  assert.equal(eventPrice({ type: "kompetisi", price: "", price_amount: 300000 }), "Rp 300.000 / tim");
  assert.equal(eventPrice({ type: "mabar", price: "", price_amount: 50000 }), "Rp 50.000");
  assert.equal(eventPrice({ type: "kompetisi", price: "Rp 120rb / tim", price_amount: null }), "Rp 120rb / tim");
  assert.equal(eventPrice({ type: "kompetisi", price: "Lama", price_amount: 0 }), "Lama");
  assert.equal(eventPrice({ type: "kompetisi", price: "  " }), "Hubungi admin");
});

test("durasi event: duration_hours, default 3 jam kompetisi / 2 jam mabar", () => {
  assert.equal(eventDurationHours({ type: "kompetisi", duration_hours: 4 }), 4);
  assert.equal(eventDurationHours({ type: "kompetisi" }), 3);
  assert.equal(eventDurationHours({ type: "mabar", duration_hours: null }), 2);
  assert.equal(addHoursHHMM("18:00", 3), "21:00");
  assert.equal(addHoursHHMM("18:30", 1.5), "20:00");
  assert.equal(addHoursHHMM("23:00", 2), "01:00");
});
