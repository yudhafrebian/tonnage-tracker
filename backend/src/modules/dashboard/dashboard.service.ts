import { addMonths, monthRange, monthsEndingAt } from "../../lib/date";
import * as recapRepo from "../recap/recap.repository";
import { loadFinance, trackingWindow } from "../recap/recap.service";
import { buildDailyTrend, buildDashboardSummary, buildMonthlyTrend } from "./dashboard.calc";

// Rekap dan data keuangan (tarif, pengeluaran) untuk bulan firstMonth sampai lastMonth,
// plus jendela hitungan hari kosong.
const loadMonths = async (firstMonth: string, lastMonth: string, includeFinance: boolean) => {
  const range = { gte: monthRange(firstMonth).gte, lt: monthRange(lastMonth).lt };
  const [recaps, finance, window] = await Promise.all([
    recapRepo.findInRange(range),
    loadFinance(range, includeFinance),
    trackingWindow(),
  ]);
  return { recaps, finance, window };
};

export const getSummary = async (month: string, includeFinance: boolean) => {
  const { recaps, finance, window } = await loadMonths(addMonths(month, -1), month, includeFinance);
  return buildDashboardSummary(month, recaps, finance, window);
};

export const getDailyTrend = async (month: string, includeFinance: boolean) => {
  const { recaps, finance, window } = await loadMonths(month, month, includeFinance);
  return buildDailyTrend(month, recaps, finance, window);
};

export const getMonthlyTrend = async (to: string, count: number, includeFinance: boolean) => {
  const months = monthsEndingAt(to, count);
  const { recaps, finance, window } = await loadMonths(months[0]!, to, includeFinance);
  return buildMonthlyTrend(months, recaps, finance, window);
};
