import z from "zod";
import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../lib/errors";

export const validateBody =
  (schema: z.ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fields = z.flattenError(result.error).fieldErrors;
      return next(
        new HttpError(400, "validation_failed", fields, "Invalid Data"),
      );
    }
    req.body = result.data;
    next();
  };
