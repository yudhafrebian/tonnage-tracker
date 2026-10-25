import api from "@/shared/lib/api";
import type { DailyTrend, DashboardSummary, MonthlyTrend } from "../types/types";

export const getDashboardSummaryApi = async (month: string) => {
  const res = await api.get<{ success: true; data: DashboardSummary }>("/dashboard/summary", {
    params: { month },
  });
  return res.data.data;
};

export const getDailyTrendApi = async (month: string) => {
  const res = await api.get<{ success: true; data: DailyTrend }>("/dashboard/daily", {
    params: { month },
  });
  return res.data.data;
};

// 12 bulan yang berakhir di `to` (termasuk).
export const getMonthlyTrendApi = async (to: string) => {
  const res = await api.get<{ success: true; data: MonthlyTrend }>("/dashboard/monthly", {
    params: { to, months: 12 },
  });
  return res.data.data;
};
