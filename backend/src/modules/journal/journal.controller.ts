import type { Request, Response } from "express";
import { HttpError } from "../../lib/errors";
import * as journalService from "./journal.service";
import {
  dayQuerySchema,
  idParamSchema,
  importMarketsSchema,
  importQuerySchema,
  monthQuerySchema,
} from "./journal.schema";

export const GetDay = async (req: Request, res: Response) => {
  const { date } = dayQuerySchema.parse(req.query);
  res.status(200).send({ success: true, data: await journalService.getDay(date) });
};

export const GetMonth = async (req: Request, res: Response) => {
  const { month } = monthQuerySchema.parse(req.query);
  res.status(200).send({ success: true, data: await journalService.getMonth(month) });
};

export const GetLatest = async (_req: Request, res: Response) => {
  res.status(200).send({ success: true, data: await journalService.getLatestDate() });
};

// multipart: field "file" (.xlsx) + field "markets" (JSON, wajib saat dryRun=false).
export const Import = async (req: Request, res: Response) => {
  const { dryRun } = importQuerySchema.parse(req.query);
  let markets = null;
  if (!dryRun) {
    let raw: unknown;
    try {
      raw = JSON.parse(String(req.body?.markets ?? ""));
    } catch {
      throw new HttpError(400, "validation_failed", { markets: ["invalid_json"] }, "markets must be JSON");
    }
    markets = importMarketsSchema.parse(raw);
  }
  const data = await journalService.importFile(req.user!.id, req.file!.buffer, { dryRun, markets });
  res.status(dryRun ? 200 : 201).send({ success: true, data });
};

export const CreateEntries = async (req: Request, res: Response) => {
  const data = await journalService.createEntries(req.user!.id, req.body);
  res.status(201).send({ success: true, data });
};

export const UpdateEntry = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const data = await journalService.updateEntry(req.user!.id, id, req.body);
  res.status(200).send({ success: true, data });
};

export const RemoveEntry = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  await journalService.removeEntry(req.user!.id, id);
  res.status(204).send();
};

export const CopyStock = async (req: Request, res: Response) => {
  const data = await journalService.copyStock(req.user!.id, req.body.date);
  res.status(201).send({ success: true, data });
};
