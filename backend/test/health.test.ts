import request from "supertest";

const queryRaw = jest.fn();
jest.mock("../src/config/prisma.ts", () => ({
  prisma: {
    $queryRaw: (...a: unknown[]) => queryRaw(...a),
    $disconnect: jest.fn(),
  },
}));

import { app } from "../src/app";

describe("GET /api/health", () => {
  beforeEach(() => {
    queryRaw.mockReset();
  });

  it("200 when DB up", async () => {
    queryRaw.mockImplementation(async () => [{ "?column": 1 }]);
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, db: "up" });
  });

  it("500 when DB down", async () => {
    queryRaw.mockImplementation(async () => {
      throw new Error("DB is down");
    });
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ ok: false, db: "down" });
  });

  it("404 when endpoint not exist", async () => {
    const res = await request(app).get("/api/invalid");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: "not_found", message: "Data not found" },
    });
  });
});
