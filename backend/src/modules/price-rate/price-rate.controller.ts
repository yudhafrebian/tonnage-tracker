import type { Request, Response } from "express";
import z from "zod";
import * as priceRateService from "./price-rate.service";

const idParam = z.string().min(1).max(64);

export const List = async (_req: Request, res: Response) => {
  res.status(200).send({ success: true, data: await priceRateService.list() });
};

export const Create = async (req: Request, res: Response) => {
  const data = await priceRateService.create(req.user!.id, req.body);
  res.status(201).send({ success: true, data });
};

export const Update = async (req: Request, res: Response) => {
  const id = idParam.parse(req.params.id);
  const data = await priceRateService.update(req.user!.id, id, req.body);
  res.status(200).send({ success: true, data });
};

export const Remove = async (req: Request, res: Response) => {
  await priceRateService.remove(req.user!.id, idParam.parse(req.params.id));
  res.status(204).send();
};
