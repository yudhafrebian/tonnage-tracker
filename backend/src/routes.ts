import { Router } from "express";
import { router as authRouter } from "./modules/auth/auth.routes";
import { router as recapRouter } from "./modules/recap/recap.routes";
import { router as priceRateRouter } from "./modules/price-rate/price-rate.routes";
import { router as auditLogRouter } from "./modules/audit-log/audit-log.routes";
import { router as dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { router as expenseRouter } from "./modules/expense/expense.routes";
import { requireCsrfHeader } from "./middleware/csrf";

export const api = Router()

api.use(requireCsrfHeader)
api.use("/auth", authRouter)
api.use("/recaps", recapRouter)
api.use("/price-rates", priceRateRouter)
api.use("/audit-logs", auditLogRouter)
api.use("/dashboard", dashboardRouter)
api.use("/expenses", expenseRouter)
