import type { Request, Response } from "express";
import { can } from "../../lib/permissions";
import * as recapService from "./recap.service";
import {
  createRecapSchema,
  dateParamSchema,
  exportQuerySchema,
  importQuerySchema,
  methodQuerySchema,
  monthQuerySchema,
  updateRecapSchema,
  yearQuerySchema,
} from "./recap.schema";

const includeFinance = (req: Request) => can(req.user!.role, "finance:read");

export const GetMonthly = async (req: Request, res: Response) => {
  const { month } = monthQuerySchema.parse(req.query);
  const data = await recapService.getMonthly(month, includeFinance(req));
  res.status(200).send({ success: true, data });
};

export const GetYearly = async (req: Request, res: Response) => {
  const { year } = yearQuerySchema.parse(req.query);
  const data = await recapService.getYearly(year, includeFinance(req));
  res.status(200).send({ success: true, data });
};

export const GetByDate = async (req: Request, res: Response) => {
  const { date } = dateParamSchema.parse(req.params);
  const data = await recapService.getByDate(date, includeFinance(req));
  res.status(200).send({ success: true, data });
};

// Skema body bergantung pada ?method=, jadi validasinya di sini, bukan lewat validateBody.
export const Create = async (req: Request, res: Response) => {
  const { method } = methodQuerySchema.parse(req.query);
  const body = createRecapSchema(method).parse(req.body);
  const data = await recapService.create(req.user!.id, method, body, includeFinance(req));
  res.status(201).send({ success: true, data });
};

export const Update = async (req: Request, res: Response) => {
  const { date } = dateParamSchema.parse(req.params);
  const { method } = methodQuerySchema.parse(req.query);
  const body = updateRecapSchema(method).parse(req.body);
  const data = await recapService.update(req.user!.id, date, method, body, includeFinance(req));
  res.status(200).send({ success: true, data });
};

export const Remove = async (req: Request, res: Response) => {
  const { date } = dateParamSchema.parse(req.params);
  await recapService.remove(req.user!.id, date);
  res.status(204).send();
};

export const Export = async (req: Request, res: Response) => {
  const { month } = exportQuerySchema.parse(req.query);
  const { fileName, buffer } = await recapService.exportMonth(month, includeFinance(req));
  res
    .status(200)
    .type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    .attachment(fileName)
    .send(Buffer.from(buffer));
};

export const Template = async (req: Request, res: Response) => {
  const { month } = exportQuerySchema.parse(req.query);
  const { fileName, buffer } = await recapService.importTemplate(month);
  res
    .status(200)
    .type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    .attachment(fileName)
    .send(Buffer.from(buffer));
};

export const Import = async (req: Request, res: Response) => {
  const { month, ...options } = importQuerySchema.parse(req.query);
  const data = await recapService.importMonth(req.user!.id, month, req.file!.buffer, options);
  res.status(options.dryRun ? 200 : 201).send({ success: true, data });
};
