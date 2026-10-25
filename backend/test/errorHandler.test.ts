import express from "express";
import request from "supertest";
import { Prisma } from "../src/generated/prisma/client";
import { errorHandler } from "../src/middleware/errorHandler";

const prismaError = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError("prisma error", {
    code,
    clientVersion: "test",
    meta,
  });

const appThatThrows = (err: unknown) => {
  const app = express();
  app.get("/boom", () => {
    throw err;
  });
  app.use(errorHandler);
  return app;
};

describe("errorHandler", () => {
  it("JSON rusak: 400, bukan 500", async () => {
    const app = express();
    app.use(express.json());
    app.post("/x", (_req, res) => res.send({}));
    app.use(errorHandler);
    const res = await request(app)
      .post("/x")
      .set("Content-Type", "application/json")
      .send("{bukan json");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_request");
  });

  it("body terlalu besar: 413", async () => {
    const app = express();
    app.use(express.json({ limit: "10b" }));
    app.post("/x", (_req, res) => res.send({}));
    app.use(errorHandler);
    const res = await request(app)
      .post("/x")
      .send({ data: "lebih dari sepuluh byte" });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("payload_too_large");
  });

  it("Prisma P2002 (unique): 409 dengan field", async () => {
    const res = await request(
      appThatThrows(prismaError("P2002", { target: ["nameKey"] })),
    ).get("/boom");
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("conflict");
    expect(res.body.error.fields).toEqual({ nameKey: ["already_exists"] });
  });

  it("Prisma P2025 (record tidak ada): 404", async () => {
    const res = await request(appThatThrows(prismaError("P2025"))).get("/boom");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
  });

  it("error tak dikenal: 500 tanpa detail", async () => {
    const res = await request(appThatThrows(new Error("rahasia"))).get("/boom");
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("rahasia");
  });
});
