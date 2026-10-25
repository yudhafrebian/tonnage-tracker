import { Request, Response, NextFunction } from "express";
import { HttpError } from "../lib/errors";
import { logger } from "../lib/logger";
import { Prisma } from "../generated/prisma/client";
import z from "zod";

// Error dari body-parser (JSON rusak, body terlalu besar) membawa status 4xx.
const clientErrorStatus = (err: unknown): number | undefined => {
  if (typeof err !== "object" || err === null) return undefined;
  const status = (err as { status?: unknown; statusCode?: unknown }).status ??
    (err as { statusCode?: unknown }).statusCode;
  return typeof status === "number" && status >= 400 && status < 500
    ? status
    : undefined;
};

const fromPrismaError = (
  err: Prisma.PrismaClientKnownRequestError,
): HttpError | undefined => {
  switch (err.code) {
    case "P2002": {
      const target = err.meta?.target;
      const fields = Array.isArray(target)
        ? Object.fromEntries(target.map((f) => [String(f), ["already_exists"]]))
        : undefined;
      return new HttpError(409, "conflict", fields, "Data already exists");
    }
    case "P2025":
      return new HttpError(404, "not_found", undefined, "Data not found");
    case "P2003":
      return new HttpError(
        409,
        "conflict",
        undefined,
        "Data is still referenced by other data",
      );
    default:
      return undefined;
  }
};

const sendHttpError = (res: Response, err: HttpError) =>
  res.status(err.status).send({
    error: {
      code: err.code,
      message: err.message,
      ...(err.fields ? { fields: err.fields } : {}),
    },
  });

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof z.ZodError) {
    return res.status(400).send({
      error: {
        code: "validation_failed",
        message: "Invalid Data",
        fields: z.flattenError(err).fieldErrors,
      },
    });
  }
  if (err instanceof HttpError) {
    return sendHttpError(res, err);
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = fromPrismaError(err);
    if (mapped) return sendHttpError(res, mapped);
  }
  const status = clientErrorStatus(err);
  if (status) {
    const code =
      status === 413
        ? "payload_too_large"
        : status === 400
          ? "invalid_request"
          : "client_error";
    return sendHttpError(
      res,
      new HttpError(status, code, undefined, "Invalid request"),
    );
  }
  logger.error({ err }, "Unhandled error");
  res.status(500).send({
    error: { code: "internal_error", message: "Internal server error" },
  });
}
