import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requirePermision } from "../../middleware/requirePermission";
import { validateBody } from "../../middleware/validate";
import * as controller from "./expense.controller";
import { createExpenseSchema, updateExpenseSchema } from "./expense.schema";

export const router = Router();

router.use(requireAuth);
router.get("/", requirePermision("expense:read"), controller.List);
// /categories harus didaftarkan sebelum /:id.
router.get("/categories", requirePermision("expense:read"), controller.Categories);
router.get("/:id", requirePermision("expense:read"), controller.GetById);
router.post(
  "/",
  requirePermision("expense:write"),
  validateBody(createExpenseSchema),
  controller.Create,
);
router.patch(
  "/:id",
  requirePermision("expense:write"),
  validateBody(updateExpenseSchema),
  controller.Update,
);
router.delete("/:id", requirePermision("expense:write"), controller.Remove);
