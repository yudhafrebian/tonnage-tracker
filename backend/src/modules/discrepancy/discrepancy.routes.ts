import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requirePermision } from "../../middleware/requirePermission";
import { validateBody } from "../../middleware/validate";
import * as controller from "./discrepancy.controller";
import { createDiscrepancySchema, updateDiscrepancySchema } from "./discrepancy.schema";

export const router = Router();

// Catatan selisih stok memakai izin jurnal: semua role melihat, Owner/Admin mencatat.
router.use(requireAuth);
router.get("/", requirePermision("journal:read"), controller.List);
router.post("/", requirePermision("journal:write"), validateBody(createDiscrepancySchema), controller.Create);
router.patch("/:id", requirePermision("journal:write"), validateBody(updateDiscrepancySchema), controller.Update);
router.delete("/:id", requirePermision("journal:write"), controller.Remove);
