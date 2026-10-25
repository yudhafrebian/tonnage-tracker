import rateLimit from "express-rate-limit";
import { env } from "../config/env";
import { HttpError } from "../lib/errors";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  handler: (_req, _res, next) =>
    next(
      new HttpError(
        429,
        "too_many_attempts",
        undefined,
        "Too many attempts, try again later",
      ),
    ),
});
