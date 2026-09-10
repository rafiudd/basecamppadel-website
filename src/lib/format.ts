const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** "2026-09-10" -> "Kamis, 10 Sep" */
export function formatSessionDay(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${DAYS[date.getUTCDay()]}, ${d} ${MONTHS[m - 1]}`;
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

export function formatTimer(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
