import type { DailyRecap } from "../../generated/prisma/client";
import { addMonths, daysInMonth, toDateString } from "../../lib/date";
import {
  buildMonthlyRecap,
  summarizeMonth,
  type Finance,
  type MonthSummary,
  type TrackingWindow,
} from "../recap/recap.calc";

// Persentase perubahan, 1 desimal. null kalau pembandingnya 0 (tidak bisa dihitung).
export const changePct = (current: number, previous: number): number | null =>
  previous === 0 ? null : Math.round(((current - previous) / previous) * 1000) / 10;

// Porsi bagian dari total dalam persen, 1 desimal. null kalau total 0.
export const sharePct = (part: number, total: number): number | null =>
  total === 0 ? null : Math.round((part / total) * 1000) / 10;

const dateOf = (month: string, day: number) => `${month}-${String(day).padStart(2, "0")}`;

export type DashboardSummary = {
  month: string;
  // Data dihitung sampai tanggal ini: hari ini untuk bulan berjalan, akhir bulan untuk bulan lalu,
  // null untuk bulan yang belum dimulai.
  asOf: string | null;
  current: MonthSummary;
  // Bulan sebelumnya pada periode yang sama (tanggal 1 sampai tanggal asOf), supaya bulan
  // berjalan yang baru setengah tidak dibandingkan dengan bulan penuh.
  previous: MonthSummary & { period: { from: string; to: string } | null };
  change: {
    process: number | null;
    packing: number | null;
    income?: number | null;
    expense?: number | null;
    profit?: number | null;
  };
  // Porsi ekspor dari total, dalam persen.
  exportShare: { process: number | null; packing: number | null; stock: number | null };
  averageProcessPerDay: number | null;
};

export function buildDashboardSummary(
  month: string,
  recaps: DailyRecap[], // rekap dan pengeluaran mencakup bulan ini dan bulan sebelumnya
  finance: Finance | null,
  window: TrackingWindow,
): DashboardSummary {
  const monthEnd = dateOf(month, daysInMonth(month));
  const asOf = window.today < `${month}-01` ? null : window.today < monthEnd ? window.today : monthEnd;
  const cutoffDay = asOf ? Number(asOf.slice(8, 10)) : 0;

  const prevMonth = addMonths(month, -1);
  // Bulan yang sudah selesai dibandingkan dengan bulan lalu secara penuh;
  // bulan berjalan dengan tanggal yang sama (dibatasi panjang bulan lalu).
  const prevCutoffDay =
    asOf === monthEnd ? daysInMonth(prevMonth) : Math.min(cutoffDay, daysInMonth(prevMonth));
  const prevTo = prevCutoffDay > 0 ? dateOf(prevMonth, prevCutoffDay) : null;

  const until = <T extends { date: Date }>(rows: T[], to: string | null) =>
    to === null ? [] : rows.filter((r) => toDateString(r.date) <= to);
  const financeUntil = (to: string | null): Finance | null =>
    finance && { rates: finance.rates, expenses: until(finance.expenses, to) };

  const current = summarizeMonth(month, until(recaps, asOf), financeUntil(asOf), window);
  // Hari kosong bulan lalu juga hanya dihitung dalam periode pembanding.
  const previous = summarizeMonth(prevMonth, until(recaps, prevTo), financeUntil(prevTo), {
    start: prevTo === null ? null : window.start,
    today: prevTo ?? window.today,
  });

  const change: DashboardSummary["change"] = {
    process: changePct(current.process.total, previous.process.total),
    packing: changePct(current.packing.total, previous.packing.total),
  };
  if (finance) {
    change.income = changePct(current.income ?? 0, previous.income ?? 0);
    change.expense = changePct(current.expense ?? 0, previous.expense ?? 0);
    change.profit = changePct(current.profit ?? 0, previous.profit ?? 0);
  }

  return {
    month,
    asOf,
    current,
    previous: { ...previous, period: prevTo ? { from: `${prevMonth}-01`, to: prevTo } : null },
    change,
    exportShare: {
      process: sharePct(current.process.export, current.process.total),
      packing: sharePct(current.packing.export, current.packing.total),
      stock: current.stock ? sharePct(current.stock.export, current.stock.total) : null,
    },
    averageProcessPerDay:
      current.recordedDays === 0
        ? null
        : Math.round((current.process.total / current.recordedDays) * 100) / 100,
  };
}

export type DailyPoint = {
  date: string;
  recorded: boolean;
  processExport: number | null;
  processLocal: number | null;
  packingExport: number | null;
  packingLocal: number | null;
  stockExport: number | null;
  stockLocal: number | null;
  income?: number | null;
  expense?: number;
};

// Deret harian datar (satu angka per field) agar mudah dipakai library grafik.
// Tanggal tanpa rekap bernilai null, bukan 0, supaya grafik menampilkan celah, bukan penurunan.
export function buildDailyTrend(
  month: string,
  recaps: DailyRecap[],
  finance: Finance | null,
  window: TrackingWindow,
): { month: string; days: DailyPoint[] } {
  const m = buildMonthlyRecap(month, recaps, finance, window);
  return {
    month,
    days: m.days.map(({ date, recap: r, expense }) => {
      const point: DailyPoint = {
        date,
        recorded: r !== null,
        processExport: r?.process.export ?? null,
        processLocal: r?.process.local ?? null,
        packingExport: r?.packing.export ?? null,
        packingLocal: r?.packing.local ?? null,
        stockExport: r?.stock.export ?? null,
        stockLocal: r?.stock.local ?? null,
      };
      if (finance) {
        point.income = r?.income ?? null;
        // Pengeluaran bisa ada di tanggal tanpa rekap, jadi selalu angka (0 kalau tidak ada).
        point.expense = expense ?? 0;
      }
      return point;
    }),
  };
}

export function buildMonthlyTrend(
  months: string[],
  recaps: DailyRecap[],
  finance: Finance | null,
  window: TrackingWindow,
) {
  return {
    from: months[0]!,
    to: months[months.length - 1]!,
    months: months.map((m) => summarizeMonth(m, recaps, finance, window)),
  };
}
