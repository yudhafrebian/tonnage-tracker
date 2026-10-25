import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { logger } from "./lib/logger";

const server = app.listen(env.PORT, () => {
  logger.info(`tonnage-api running on port ${env.PORT}`);
});

async function shutdown(signal:string) {
    logger.info(`${signal} received, shutting down...`)
    server.close(async() => {
        await prisma.$disconnect();
        process.exit(0)
    })
    setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
