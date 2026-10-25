import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requirePermision } from "../../middleware/requirePermission";
import { uploadXlsx } from "../../middleware/upload";
import * as controller from "./recap.controller";

export const router = Router();

router.use(requireAuth);
router.get("/", requirePermision("recap:read"), controller.GetMonthly);
// /yearly, /export, /template, dan /import harus didaftarkan sebelum /:date.
router.get("/yearly", requirePermision("recap:read"), controller.GetYearly);
router.get("/export", requirePermision("recap:read"), controller.Export);
router.get("/template", requirePermision("recap:write"), controller.Template);
router.post("/import", requirePermision("recap:write"), uploadXlsx("file"), controller.Import);
router.get("/:date", requirePermision("recap:read"), controller.GetByDate);
router.post("/", requirePermision("recap:write"), controller.Create);
router.patch("/:date", requirePermision("recap:write"), controller.Update);
router.delete("/:date", requirePermision("recap:write"), controller.Remove);
