import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const requireCsrfHeader = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }
  if (!req.get("x-requested-with")) {
    return next(
      new HttpError(
        403,
        "csrf_blocked",
        undefined,
        "header x-requested-with missing",
      ),
    );
  }

  next();
};
