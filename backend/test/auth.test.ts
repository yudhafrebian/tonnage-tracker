import bcrypt from "bcryptjs";
import request from "supertest";

const findUnique = jest.fn();
const update = jest.fn();
jest.mock("../src/config/prisma", () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
    user: { findUnique: (...a: unknown[]) => findUnique(...a), update: (...a: unknown[]) => update(...a) },
  },
}));

import { app } from "../src/app";

const CSRF = { "X-Requested-With": "test" };
const PASSWORD = "password-panjang-123";

const makeUser = (over: Record<string, unknown> = {}) => ({
  id: "11111111-1111-4111-8111-111111111111",
  username: "weka",
  name: "Weka",
  role: "ADMIN",
  active: true,
  passwordHash: bcrypt.hashSync(PASSWORD, 4), // cost rendah agar tes cepat
  ...over,
});

// findUnique dipakai untuk login (by username), requireAuth (by id), dan change-password (by id).
function mockDb(user: ReturnType<typeof makeUser> | null) {
  findUnique.mockImplementation(async () => user);
}

async function loginCookie(user = makeUser()) {
  mockDb(user);
  const res = await request(app).post("/api/v1/auth/login").set(CSRF).send({ username: user.username, password: PASSWORD });
  expect(res.status).toBe(200);
  return (res.headers["set-cookie"] as unknown as string[]).map((c) => c.split(";")[0]).join("; ");
}

beforeEach(() => {
  findUnique.mockReset();
  update.mockReset();
});

describe("POST /api/v1/auth/login", () => {
  it("berhasil: cookie HttpOnly dan tidak membocorkan passwordHash", async () => {
    mockDb(makeUser());
    const res = await request(app).post("/api/v1/auth/login").set(CSRF).send({ username: "weka", password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, code: "login_success", message: "Login Success" });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    const cookie = (res.headers["set-cookie"] as unknown as string[])[0]!;
    expect(cookie).toContain("tonnage_token=");
    expect(cookie).toContain("HttpOnly");
  });

  it("password salah: 401 dengan pesan generik", async () => {
    mockDb(makeUser());
    const res = await request(app).post("/api/v1/auth/login").set(CSRF).send({ username: "weka", password: "salah-salah-salah" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("invalid_credentials");
  });

  it("username tidak terdaftar: 401 dengan pesan yang sama", async () => {
    mockDb(null);
    const res = await request(app).post("/api/v1/auth/login").set(CSRF).send({ username: "tidak-ada", password: PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("invalid_credentials");
  });

  it("user nonaktif: 401", async () => {
    mockDb(makeUser({ active: false }));
    const res = await request(app).post("/api/v1/auth/login").set(CSRF).send({ username: "weka", password: PASSWORD });
    expect(res.status).toBe(401);
  });

  it("input tidak valid: 400 dengan detail field", async () => {
    const res = await request(app).post("/api/v1/auth/login").set(CSRF).send({ username: "", password: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_failed");
    expect(res.body.error.fields.username).toBeDefined();
  });

  it("tanpa header X-Requested-With: 403", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ username: "weka", password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("csrf_blocked");
  });
});

describe("GET /api/v1/auth/me", () => {
  it("tanpa login: 401", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthenticated");
  });

  it("dengan cookie login: data user", async () => {
    const cookie = await loginCookie();
    const res = await request(app).get("/api/v1/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: expect.any(String), username: "weka", name: "Weka", role: "ADMIN" });
  });

  it("token palsu: 401", async () => {
    const res = await request(app).get("/api/v1/auth/me").set("Cookie", "tonnage_token=bukan.token.valid");
    expect(res.status).toBe(401);
  });

  it("user dinonaktifkan setelah login: 401", async () => {
    const cookie = await loginCookie();
    mockDb(makeUser({ active: false }));
    const res = await request(app).get("/api/v1/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(401);
  });

  it("role berubah setelah login: role terbaru yang dipakai", async () => {
    const cookie = await loginCookie();
    mockDb(makeUser({ role: "VIEWER" }));
    const res = await request(app).get("/api/v1/auth/me").set("Cookie", cookie);
    expect(res.body.data.role).toBe("VIEWER");
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("menghapus cookie", async () => {
    const res = await request(app).post("/api/v1/auth/logout").set(CSRF);
    expect(res.status).toBe(204);
    expect((res.headers["set-cookie"] as unknown as string[])[0]).toContain("tonnage_token=;");
  });
});

describe("POST /api/v1/auth/change-password", () => {
  it("berhasil dan menyimpan hash baru", async () => {
    const cookie = await loginCookie();
    update.mockImplementation(async () => ({}));
    const res = await request(app)
      .post("/api/v1/auth/change-password")
      .set(CSRF)
      .set("Cookie", cookie)
      .send({ currentPassword: PASSWORD, newPassword: "password-baru-yang-panjang" });
    expect(res.status).toBe(204);
    const saved = update.mock.calls[0]![0] as { data: { passwordHash: string } };
    expect(saved.data.passwordHash).not.toContain("password-baru");
    expect(await bcrypt.compare("password-baru-yang-panjang", saved.data.passwordHash)).toBe(true);
  });

  it("password saat ini salah: 400", async () => {
    const cookie = await loginCookie();
    const res = await request(app)
      .post("/api/v1/auth/change-password")
      .set(CSRF)
      .set("Cookie", cookie)
      .send({ currentPassword: "salah-salah-salah", newPassword: "password-baru-yang-panjang" });
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("password baru terlalu pendek: 400", async () => {
    const cookie = await loginCookie();
    const res = await request(app)
      .post("/api/v1/auth/change-password")
      .set(CSRF)
      .set("Cookie", cookie)
      .send({ currentPassword: PASSWORD, newPassword: "pendek" });
    expect(res.status).toBe(400);
  });
});