import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/errors";

// 4 MB: batas body request Vercel Functions 4,5 MB (termasuk overhead multipart).
const MAX_XLSX_BYTES = 4 * 1024 * 1024;

const xlsxUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_XLSX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith(".xlsx")) {
      return cb(new HttpError(400, "invalid_file", { file: ["only_xlsx"] }, "Only .xlsx files are allowed"));
    }
    cb(null, true);
  },
});

// Satu file .xlsx di field "file". Error multer diubah ke HttpError agar formatnya sama dengan error lain.
export const uploadXlsx = (field: string) => (req: Request, res: Response, next: NextFunction) =>
  xlsxUpload.single(field)(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      return next(
        err.code === "LIMIT_FILE_SIZE"
          ? new HttpError(413, "payload_too_large", { file: ["file_too_large"] }, "File is larger than 4 MB")
          : new HttpError(400, "invalid_file", { file: ["invalid_upload"] }, `Invalid upload: ${err.message}`),
      );
    }
    if (err) return next(err);
    if (!req.file) {
      return next(new HttpError(400, "invalid_file", { file: ["file_required"] }, "File is required"));
    }
    next();
  });
