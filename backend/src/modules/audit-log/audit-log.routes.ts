import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requirePermision } from "../../middleware/requirePermission";
import * as controller from "./audit-log.controller";

export const router = Router();

router.use(requireAuth);
router.get("/", requirePermision("audit-log:read"), controller.List);
