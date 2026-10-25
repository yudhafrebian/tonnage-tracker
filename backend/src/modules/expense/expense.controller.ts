import type { Request, Response } from "express";
import * as expenseService from "./expense.service";
import { idParamSchema, listExpenseQuerySchema } from "./expense.schema";

export const List = async (req: Request, res: Response) => {
  const { month, category } = listExpenseQuerySchema.parse(req.query);
  res.status(200).send({ success: true, data: await expenseService.listMonth(month, category) });
};

export const Categories = async (_req: Request, res: Response) => {
  res.status(200).send({ success: true, data: await expenseService.listCategories() });
};

export const GetById = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  res.status(200).send({ success: true, data: await expenseService.getById(id) });
};

export const Create = async (req: Request, res: Response) => {
  const data = await expenseService.create(req.user!.id, req.body);
  res.status(201).send({ success: true, data });
};

export const Update = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const data = await expenseService.update(req.user!.id, id, req.body);
  res.status(200).send({ success: true, data });
};

export const Remove = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  await expenseService.remove(req.user!.id, id);
  res.status(204).send();
};
