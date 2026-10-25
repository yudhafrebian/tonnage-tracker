import type { Request, Response } from "express";
import * as auditLogService from "./audit-log.service";
import { listAuditLogQuerySchema } from "./audit-log.schema";

export const List = async (req: Request, res: Response) => {
  const query = listAuditLogQuerySchema.parse(req.query);
  res.status(200).send({ success: true, data: await auditLogService.list(query) });
};
