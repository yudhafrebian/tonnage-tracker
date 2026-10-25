import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requirePermision } from "../../middleware/requirePermission";
import { validateBody } from "../../middleware/validate";
import * as controller from "./price-rate.controller";
import { createPriceRateSchema, updatePriceRateSchema } from "./price-rate.schema";

export const router = Router();

router.use(requireAuth);
router.get("/", requirePermision("price-rate:read"), controller.List);
router.post(
  "/",
  requirePermision("price-rate:write"),
  validateBody(createPriceRateSchema),
  controller.Create,
);
router.patch(
  "/:id",
  requirePermision("price-rate:write"),
  validateBody(updatePriceRateSchema),
  controller.Update,
);
router.delete("/:id", requirePermision("price-rate:write"), controller.Remove);
