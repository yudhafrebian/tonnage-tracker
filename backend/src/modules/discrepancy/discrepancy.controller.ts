import type { Request, Response } from "express";
import * as discrepancyService from "./discrepancy.service";
import { idParamSchema, listQuerySchema } from "./discrepancy.schema";

export const List = async (req: Request, res: Response) => {
  const filter = listQuerySchema.parse(req.query);
  res.status(200).send({ success: true, data: await discrepancyService.list(filter) });
};

export const Create = async (req: Request, res: Response) => {
  const data = await discrepancyService.create(req.user!.id, req.body);
  res.status(201).send({ success: true, data });
};

export const Update = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const data = await discrepancyService.update(req.user!.id, id, req.body);
  res.status(200).send({ success: true, data });
};

export const Remove = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  await discrepancyService.remove(req.user!.id, id);
  res.status(204).send();
};
