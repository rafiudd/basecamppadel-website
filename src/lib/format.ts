const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const DAY_SHORT = ["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"];
const MONTH_SHORT = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];

/** "2026-09-10" -> "Kamis, 10 Sep" */
export function formatSessionDay(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${DAYS[date.getUTCDay()]}, ${d} ${MONTHS[m - 1]}`;
}

export function parseDateParts(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayIdx = date.getUTCDay();
  const monthIdx = m - 1;
  return {
    day: DAY_SHORT[dayIdx] || "MIN",
    date: String(d),
    month: MONTH_SHORT[monthIdx] || "OKT",
    year: String(y),
    dateFormatted: `${DAYS[dayIdx] || "Minggu"}, ${d} ${MONTHS[monthIdx] || "Okt"} ${y}`,
  };
}

export function formatPointsDelta(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

export function winRate(wins: number, losses: number): number {
  const total = wins + losses;
  return total === 0 ? 0 : Math.round((wins / total) * 100);
}

/** Elapsed match time from a matches row. */
export function matchElapsedSeconds(m: {
  timer_running: boolean;
  timer_start: string | null;
  timer_base_seconds: number;
}, now = Date.now()): number {
  let elapsed = m.timer_base_seconds || 0;
  if (m.timer_running && m.timer_start) {
    elapsed += (now - new Date(m.timer_start).getTime()) / 1000;
  }
  return Math.max(0, Math.floor(elapsed));
}

/** "2026-09-10T09:00:00.000Z" -> "16:00" (WIB) */
export function formatClockTime(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(iso),
  );
}

/** starts "2026-09-10T09:00:00Z", ends "2026-09-10T13:00:00Z" -> "Kamis, 10 Sep · 16:00–20:00" (WIB) */
export function formatStartLine(startsIso: string, endsIso?: string | null): string {
  const parts = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "short",
  }).formatToParts(new Date(startsIso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = get("weekday");
  const day = get("day");
  const month = get("month").replace(/\.$/, "");
  const timePart = endsIso ? `${formatClockTime(startsIso)}–${formatClockTime(endsIso)}` : formatClockTime(startsIso);
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day} ${month} · ${timePart}`;
}

/** "16.00–20.00" -> { start: "16:00", end: "20:00" }, for prefilling <input type="time"> fields. */
export function parseTimeRange(timeRange: string): { start: string; end: string } {
  const times = [...timeRange.matchAll(/(\d{1,2})[.:](\d{2})/g)];
  const fmt = (t: RegExpMatchArray) => `${t[1].padStart(2, "0")}:${t[2]}`;
  return { start: times[0] ? fmt(times[0]) : "", end: times[1] ? fmt(times[1]) : "" };
}

export function formatTimer(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Court names are often stored as just "1", "2", "A" — show them as "Court 1". Longer names pass through. */
export function courtLabel(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (!n) return "Court";
  return /^[0-9a-z]{1,3}$/i.test(n) ? `Court ${n}` : n;
}
