export type HourRate = {
  day_of_week: number;
  hour: number;
  price_per_hour: number;
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** "2026-10-09" -> 5 (Friday), matching JS Date#getDay() / court_hour_rates.day_of_week. */
export function dayOfWeekFromDateStr(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).getDay();
}

/**
 * Blended rental cost for ONE court over [startTime, startTime + durationHours): each clock hour the
 * session touches is billed at that (day, hour)'s override rate if one is set for this court,
 * otherwise the court's base rate, prorated for however many minutes of that hour fall inside the
 * session. Clipped to the same calendar day — a session that would run past midnight is billed to
 * 23:59. `rates` should already be scoped to the one court being costed (see courtRentalCost).
 */
export function courtHourCost(basePricePerHour: number, rates: HourRate[], dayOfWeek: number, startTime: string, durationHours: number): number {
  const start = toMinutes(startTime);
  const end = Math.min(start + durationHours * 60, 24 * 60);
  if (end <= start) return 0;

  const rateOf = new Map(rates.filter((r) => r.day_of_week === dayOfWeek).map((r) => [r.hour, r.price_per_hour]));

  let cost = 0;
  for (let hourStart = Math.floor(start / 60) * 60; hourStart < end; hourStart += 60) {
    const segStart = Math.max(start, hourStart);
    const segEnd = Math.min(end, hourStart + 60);
    const minutes = Math.max(0, segEnd - segStart);
    const rate = rateOf.get(hourStart / 60) ?? basePricePerHour;
    cost += (minutes / 60) * rate;
  }
  return cost;
}

/** One court's base rate + its own hourly overrides, already filtered to that court. */
export type CourtPricing = { basePricePerHour: number; rates: HourRate[] };

/** Total rental cost for a session across every court booked — each court can have its own price. */
export function courtRentalCost({
  courts,
  dayOfWeek,
  startTime,
  durationHours,
}: {
  courts: CourtPricing[];
  dayOfWeek: number;
  startTime: string;
  durationHours: number;
}): number {
  if (!startTime || durationHours <= 0 || !courts.length) return 0;
  return courts.reduce((sum, c) => sum + courtHourCost(c.basePricePerHour, c.rates, dayOfWeek, startTime, durationHours), 0);
}
