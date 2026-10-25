import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requirePermision } from "../../middleware/requirePermission";
import * as controller from "./dashboard.controller";

export const router = Router();

router.use(requireAuth, requirePermision("recap:read"));
router.get("/summary", controller.Summary);
router.get("/daily", controller.DailyTrend);
router.get("/monthly", controller.MonthlyTrend);
