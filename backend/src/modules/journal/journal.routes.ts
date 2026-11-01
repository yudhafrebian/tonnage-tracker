import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requirePermision } from "../../middleware/requirePermission";
import { uploadXlsx } from "../../middleware/upload";
import { validateBody } from "../../middleware/validate";
import * as controller from "./journal.controller";
import { copyStockSchema, createEntriesSchema, updateEntrySchema } from "./journal.schema";

export const router = Router();

router.use(requireAuth);
router.get("/", requirePermision("journal:read"), controller.GetDay);
router.get("/month", requirePermision("journal:read"), controller.GetMonth);
router.get("/latest", requirePermision("journal:read"), controller.GetLatest);
router.post("/import", requirePermision("journal:write"), uploadXlsx("file"), controller.Import);
// Input manual: beberapa baris sekaligus untuk satu pemilik/pelanggan, edit & hapus per baris.
router.post("/entries", requirePermision("journal:write"), validateBody(createEntriesSchema), controller.CreateEntries);
router.patch("/entries/:id", requirePermision("journal:write"), validateBody(updateEntrySchema), controller.UpdateEntry);
router.delete("/entries/:id", requirePermision("journal:write"), controller.RemoveEntry);
router.post("/copy-stock", requirePermision("journal:write"), validateBody(copyStockSchema), controller.CopyStock);
