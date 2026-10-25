import express from "express";
import request from "supertest";
import { errorHandler } from "../src/middleware/errorHandler";
import type { Role } from "../src/lib/permissions";
import { requirePermision } from "../src/middleware/requirePermission";

// Aplikasi mini: user disisipkan dari header, lalu dijaga izin "recap:write".
function buildApp() {
  const app = express();
  app.use((req, _res, next) => {
    const role = req.get("x-test-role") as Role | undefined;
    if (role) req.user = { id: "u1", username: "u@contoh.com", name: "U", role };
    next();
  });
  app.get("/tulis", requirePermision("recap:write"), (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

describe("requirePermission", () => {
  const app = buildApp();

  it("tanpa user: 401", async () => {
    expect((await request(app).get("/tulis")).status).toBe(401);
  });

  it("VIEWER: 403", async () => {
    const res = await request(app).get("/tulis").set("x-test-role", "VIEWER");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

  it.each(["OWNER", "ADMIN"])("%s: 200", async (role) => {
    expect((await request(app).get("/tulis").set("x-test-role", role)).status).toBe(200);
  });
});