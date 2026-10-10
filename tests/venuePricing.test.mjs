import { test } from "node:test";
import assert from "node:assert/strict";
import { courtHourCost, courtRentalCost, dayOfWeekFromDateStr } from "../src/lib/venuePricing.ts";

test("courtHourCost: no overrides falls back to the base rate for every hour", () => {
  const cost = courtHourCost(100000, [], 5, "18:00", 2);
  assert.equal(cost, 200000);
});

test("courtHourCost: an override rate applies only to its own hour", () => {
  // 18:00-20:00 touches hours 18 and 19; only 18 has an override
  const rates = [{ day_of_week: 5, hour: 18, price_per_hour: 150000 }];
  const cost = courtHourCost(100000, rates, 5, "18:00", 2);
  assert.equal(cost, 150000 + 100000);
});

test("courtHourCost: a partial hour is prorated by the minutes actually used", () => {
  // 18:30-19:30 -> 30 min of hour 18 (override) + 30 min of hour 19 (base)
  const rates = [{ day_of_week: 5, hour: 18, price_per_hour: 150000 }];
  const cost = courtHourCost(100000, rates, 5, "18:30", 1);
  assert.equal(cost, 75000 + 50000);
});

test("courtHourCost: a session running past midnight is clipped to 23:59 of the same day", () => {
  const cost = courtHourCost(100000, [], 5, "23:00", 2);
  assert.equal(cost, 100000); // only hour 23 counted
});

test("courtHourCost: only matches rates for the event's own day of week", () => {
  const rates = [
    { day_of_week: 0, hour: 18, price_per_hour: 999999 },
    { day_of_week: 5, hour: 18, price_per_hour: 150000 },
  ];
  const cost = courtHourCost(100000, rates, 5, "18:00", 1);
  assert.equal(cost, 150000);
});

test("courtRentalCost: sums each court's OWN price, not a shared flat rate", () => {
  const courts = [
    { basePricePerHour: 100000, rates: [] },
    { basePricePerHour: 150000, rates: [{ day_of_week: 5, hour: 18, price_per_hour: 200000 }] },
  ];
  const cost = courtRentalCost({ courts, dayOfWeek: 5, startTime: "18:00", durationHours: 1 });
  assert.equal(cost, 100000 + 200000);
});

test("courtRentalCost: no courts or zero duration costs nothing", () => {
  assert.equal(courtRentalCost({ courts: [], dayOfWeek: 5, startTime: "18:00", durationHours: 2 }), 0);
  assert.equal(courtRentalCost({ courts: [{ basePricePerHour: 100000, rates: [] }], dayOfWeek: 5, startTime: "18:00", durationHours: 0 }), 0);
});

test("dayOfWeekFromDateStr: matches JS Date#getDay() for a known Friday", () => {
  assert.equal(dayOfWeekFromDateStr("2026-10-09"), 5);
});

test("dayOfWeekFromDateStr: matches JS Date#getDay() for a known Sunday", () => {
  assert.equal(dayOfWeekFromDateStr("2026-10-11"), 0);
});
