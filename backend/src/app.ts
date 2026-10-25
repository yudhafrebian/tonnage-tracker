import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { logger } from "./lib/logger";
import { errorHandler } from "./middleware/errorHandler";
import cookieParser from "cookie-parser";
import { api } from "./routes";
import { notFoundError } from "./lib/errors";

export const app = express();
app.set("trust proxy", env.TRUST_PROXY);
app.use(helmet());
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser())

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).send({ ok: true, db: "up" });
  } catch (error) {
    logger.error({ err: error }, "health check: database is down");
    res.status(500).send({ ok: false, db: "down" });
  }
});

app.use("/api/v1", api)

app.use((_req, _res, next) => next(notFoundError()));
app.use(errorHandler);

// Entry Vercel: file ini (src/app.ts) dikenali otomatis dan default export-nya dijalankan sebagai
// Vercel Function. Lokal tetap lewat src/server.ts (app.listen).
export default app;
