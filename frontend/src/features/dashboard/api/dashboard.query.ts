import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getDailyTrendApi, getDashboardSummaryApi, getMonthlyTrendApi } from "./dashboard.api";

// Diawali "dashboard": rekap, pengeluaran, dan tarif menyegarkan semuanya lewat invalidate ["dashboard"].
export const dashboardKeys = {
  summary: (month: string) => ["dashboard", "summary", month] as const,
  daily: (month: string) => ["dashboard", "daily", month] as const,
  monthly: (to: string) => ["dashboard", "monthly", to] as const,
};

// keepPreviousData: saat ganti bulan, grafik lama tetap tampil sampai data baru datang (tidak berkedip).
export const useDashboardSummaryQuery = (month: string) =>
  useQuery({
    queryKey: dashboardKeys.summary(month),
    queryFn: () => getDashboardSummaryApi(month),
    placeholderData: keepPreviousData,
  });

export const useDailyTrendQuery = (month: string) =>
  useQuery({
    queryKey: dashboardKeys.daily(month),
    queryFn: () => getDailyTrendApi(month),
    placeholderData: keepPreviousData,
  });

export const useMonthlyTrendQuery = (to: string) =>
  useQuery({
    queryKey: dashboardKeys.monthly(to),
    queryFn: () => getMonthlyTrendApi(to),
    placeholderData: keepPreviousData,
  });
