import { HttpError } from "../lib/errors";
import type { Request, Response, NextFunction } from "express";
import { can, Permission } from "../lib/permissions";

export const requirePermision =
  (permision: Permission) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user)
      return next(
        new HttpError(401, "unauthenticated", undefined, "Please Login First"),
      );
    if (!can(req.user.role, permision)) {
      return next(
        new HttpError(
          403,
          "forbidden",
          undefined,
          "You don't have permission to access this resource",
        ),
      );
    }

    next();
  };
