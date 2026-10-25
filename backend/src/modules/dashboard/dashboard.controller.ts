import type { Request, Response } from "express";
import { todayString } from "../../lib/date";
import { can } from "../../lib/permissions";
import * as dashboardService from "./dashboard.service";
import { monthlyTrendQuerySchema, monthQuerySchema } from "./dashboard.schema";

const includeFinance = (req: Request) => can(req.user!.role, "finance:read");

// Bulan berjalan menurut WIB, dipakai kalau query bulan tidak diisi.
const currentMonth = () => todayString().slice(0, 7);

export const Summary = async (req: Request, res: Response) => {
  const month = monthQuerySchema.parse(req.query).month ?? currentMonth();
  const data = await dashboardService.getSummary(month, includeFinance(req));
  res.status(200).send({ success: true, data });
};

export const DailyTrend = async (req: Request, res: Response) => {
  const month = monthQuerySchema.parse(req.query).month ?? currentMonth();
  const data = await dashboardService.getDailyTrend(month, includeFinance(req));
  res.status(200).send({ success: true, data });
};

export const MonthlyTrend = async (req: Request, res: Response) => {
  const { to, months } = monthlyTrendQuerySchema.parse(req.query);
  const data = await dashboardService.getMonthlyTrend(to ?? currentMonth(), months, includeFinance(req));
  res.status(200).send({ success: true, data });
};
