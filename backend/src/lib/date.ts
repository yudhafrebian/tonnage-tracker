import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

// ATURAN: di backend ini selalu pakai dayjs.utc(...), jangan dayjs(...) biasa.
// Kolom DATE di database tidak punya jam, jadi semua tanggal diperlakukan sebagai UTC.

// "2026-10" -> rentang [1 Okt, 1 Nov)
export function monthRange(month: string): { gte: Date; lt: Date } {
  const start = dayjs.utc(`${month}-01`);
  return { gte: start.toDate(), lt: start.add(1, "month").toDate() };
}

// Date -> "2026-10-05"
export const toDateString = (d: Date): string => dayjs.utc(d).format("YYYY-MM-DD");

// Date -> "2026-10"
export const monthKey = (d: Date): string => dayjs.utc(d).format("YYYY-MM");

// ("2026-10", -5) -> "2026-05"; lompat tahun ditangani otomatis
export const addMonths = (month: string, n: number): string =>
  dayjs.utc(`${month}-01`).add(n, "month").format("YYYY-MM");

export const daysInMonth = (month: string): number => dayjs.utc(`${month}-01`).daysInMonth();

// ("2026-10", 6) -> ["2026-05", ..., "2026-10"]
export const monthsEndingAt = (to: string, count: number): string[] =>
  Array.from({ length: count }, (_, i) => addMonths(to, i - (count - 1)));

// "2026-10-05" -> Date (UTC tengah malam). Validasi formatnya dulu dengan isDateString.
export const parseDateString = (s: string): Date => dayjs.utc(s).toDate();

// Menolak tanggal yang tidak ada, misalnya "2026-02-30" (dayjs akan menggesernya ke Maret).
export const isDateString = (s: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) && dayjs.utc(s).format("YYYY-MM-DD") === s;

// ("2026-10") -> ["2026-10-01", ..., "2026-10-31"]
export const datesInMonth = (month: string): string[] =>
  Array.from({ length: daysInMonth(month) }, (_, i) =>
    dayjs.utc(`${month}-01`).add(i, "day").format("YYYY-MM-DD"),
  );

// Tanggal hari ini di WIB (UTC+7), karena laporan harian mengikuti tanggal kerja di Indonesia.
export const todayString = (now: Date = new Date()): string =>
  dayjs.utc(now).add(7, "hour").format("YYYY-MM-DD");

export const addDays = (d: Date, n: number): Date => dayjs.utc(d).add(n, "day").toDate();
