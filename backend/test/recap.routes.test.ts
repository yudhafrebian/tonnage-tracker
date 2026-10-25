import path from "path";
import request from "supertest";
import { Prisma } from "../src/generated/prisma/client";

const db = {
  user: { findUnique: jest.fn() },
  dailyRecap: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createManyAndReturn: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  priceRate: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  expense: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    groupBy: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  auditLog: { create: jest.fn(), createMany: jest.fn(), findMany: jest.fn(), count: jest.fn() },
};

jest.mock("../src/config/prisma", () => ({
  prisma: {
    ...db,
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
    // Transaksi interaktif menjalankan callback dengan client yang sama;
    // transaksi array (dipakai audit-log list) cukup menunggu semua promise.
    $transaction: (arg: unknown) =>
      typeof arg === "function" ? (arg as (tx: unknown) => unknown)(db) : Promise.all(arg as unknown[]),
  },
}));

import { app } from "../src/app";
import { signToken } from "../src/lib/token";

type Role = "OWNER" | "ADMIN" | "VIEWER";
const CSRF = { "X-Requested-With": "test" };
const USER_ID = "11111111-1111-4111-8111-111111111111";

const as = (role: Role) => {
  db.user.findUnique.mockResolvedValue({ id: USER_ID, username: "u", name: "U", role, active: true });
  return { Cookie: `tonnage_token=${signToken(USER_ID)}` };
};

const D = (v: number) => new Prisma.Decimal(v);
const day = (s: string) => new Date(`${s}T00:00:00Z`);

const storedRecap = (date: string, over: Record<string, unknown> = {}) => ({
  id: "recap-1",
  date: day(date),
  processTotal: D(7862.3), processExport: D(4355.9), processLocal: D(3506.4),
  packingTotal: D(4639.9), packingExport: D(1722), packingLocal: D(2917.9),
  stockTotal: D(33127.4), stockExport: D(19477.6), stockLocal: D(13649.8),
  note: null,
  createdAt: day(date),
  updatedAt: day(date),
  ...over,
});

const RATE = {
  id: "rate-1",
  effectiveFrom: day("2026-10-01"),
  pricePerKg: 2500,
  createdAt: day("2026-10-01"),
  updatedAt: day("2026-10-01"),
};

const validBody = {
  date: "2026-10-16",
  process: { total: 7862.3, export: 4355.9 },
  packing: { total: 4639.9, export: 1722 },
  stock: { total: 33127.4, export: 19477.6 },
};

beforeEach(() => {
  for (const model of Object.values(db)) {
    for (const fn of Object.values(model)) fn.mockReset();
  }
  db.priceRate.findMany.mockResolvedValue([RATE]);
  db.expense.findMany.mockResolvedValue([]);
  // Prisma mengembalikan data yang baru disimpan; tiru dengan menggabungkan input.
  db.dailyRecap.create.mockImplementation(async ({ data }) => storedRecap("2026-10-16", data));
  db.dailyRecap.update.mockImplementation(async ({ data }) =>
    storedRecap("2026-10-16", Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))),
  );
});

describe("GET /api/v1/recaps?month=", () => {
  it("tanpa login: 401", async () => {
    expect((await request(app).get("/api/v1/recaps?month=2026-10")).status).toBe(401);
  });

  it("VIEWER: kg tampil, harga dan pemasukan tidak dikirim", async () => {
    db.dailyRecap.findMany.mockResolvedValue([storedRecap("2026-10-16")]);
    const res = await request(app).get("/api/v1/recaps?month=2026-10").set(as("VIEWER"));
    expect(res.status).toBe(200);
    expect(res.body.data.days[15].recap.process).toEqual({ total: 7862.3, export: 4355.9, local: 3506.4 });
    expect(JSON.stringify(res.body)).not.toMatch(/income|pricePerKg/);
    expect(db.priceRate.findMany).not.toHaveBeenCalled();
  });

  it("ADMIN: pemasukan ikut dikirim", async () => {
    db.dailyRecap.findMany.mockResolvedValue([storedRecap("2026-10-16")]);
    const res = await request(app).get("/api/v1/recaps?month=2026-10").set(as("ADMIN"));
    expect(res.body.data.days[15].recap.income).toBe(19_655_750);
    expect(res.body.data.total.income).toBe(19_655_750);
  });

  it("format bulan salah: 400", async () => {
    const res = await request(app).get("/api/v1/recaps?month=2026-13").set(as("ADMIN"));
    expect(res.status).toBe(400);
    expect(res.body.error.fields.month).toBeDefined();
  });
});

describe("GET /api/v1/recaps/yearly", () => {
  it("VIEWER: 12 bulan tanpa pemasukan", async () => {
    db.dailyRecap.findMany.mockResolvedValue([storedRecap("2026-10-16")]);
    const res = await request(app).get("/api/v1/recaps/yearly?year=2026").set(as("VIEWER"));
    expect(res.status).toBe(200);
    expect(res.body.data.months).toHaveLength(12);
    expect(res.body.data.months[9].process.total).toBe(7862.3);
    expect(JSON.stringify(res.body)).not.toMatch(/income/);
  });

  it("ADMIN: pemasukan tahun", async () => {
    db.dailyRecap.findMany.mockResolvedValue([storedRecap("2026-10-16")]);
    const res = await request(app).get("/api/v1/recaps/yearly?year=2026").set(as("ADMIN"));
    expect(res.body.data.total.income).toBe(19_655_750);
    // Rentang query: 1 Jan sampai sebelum 1 Jan tahun berikutnya.
    expect(db.dailyRecap.findMany.mock.calls[0]![0].where.date).toEqual({ gte: day("2026-01-01"), lt: day("2027-01-01") });
  });

  it("tahun tidak valid: 400", async () => {
    expect((await request(app).get("/api/v1/recaps/yearly?year=abc").set(as("ADMIN"))).status).toBe(400);
  });
});

describe("GET /api/v1/recaps/:date", () => {
  it("tidak ada: 404", async () => {
    db.dailyRecap.findUnique.mockResolvedValue(null);
    expect((await request(app).get("/api/v1/recaps/2026-10-16").set(as("ADMIN"))).status).toBe(404);
  });

  it("tanggal tidak ada di kalender: 400", async () => {
    expect((await request(app).get("/api/v1/recaps/2026-02-30").set(as("ADMIN"))).status).toBe(400);
  });
});

describe("POST /api/v1/recaps", () => {
  it("VIEWER: 403", async () => {
    const res = await request(app).post("/api/v1/recaps").set(CSRF).set(as("VIEWER")).send(validBody);
    expect(res.status).toBe(403);
  });

  it("default total_export: local dihitung server dan tercatat di audit log", async () => {
    db.dailyRecap.findUnique.mockResolvedValue(null);
    const res = await request(app).post("/api/v1/recaps").set(CSRF).set(as("ADMIN")).send(validBody);
    expect(res.status).toBe(201);
    const data = db.dailyRecap.create.mock.calls[0]![0].data;
    expect(data.processLocal.toNumber()).toBe(3506.4);
    expect(data.packingLocal.toNumber()).toBe(2917.9);
    expect(data.stockLocal.toNumber()).toBe(13649.8);
    expect(res.body.data.income).toBe(19_655_750);
    const log = db.auditLog.create.mock.calls[0]![0].data;
    expect(log).toMatchObject({ userId: USER_ID, action: "create", entity: "DailyRecap" });
    expect(log.after.method).toBe("total_export");
  });

  it("method=export_local: total dihitung server", async () => {
    db.dailyRecap.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/v1/recaps?method=export_local")
      .set(CSRF)
      .set(as("OWNER"))
      .send({
        date: "2026-10-16",
        process: { export: 4355.9, local: 3506.4 },
        packing: { export: 1722, local: 2917.9 },
        stock: { export: 19477.6, local: 13649.8 },
      });
    expect(res.status).toBe(201);
    expect(db.dailyRecap.create.mock.calls[0]![0].data.processTotal.toNumber()).toBe(7862.3);
  });

  it("field tidak sesuai method: 400", async () => {
    const res = await request(app)
      .post("/api/v1/recaps?method=total_export")
      .set(CSRF)
      .set(as("ADMIN"))
      .send({ ...validBody, process: { total: 10, local: 5 } });
    expect(res.status).toBe(400);
    expect(db.dailyRecap.create).not.toHaveBeenCalled();
  });

  it("ekspor melebihi total: 400 dengan field yang jelas", async () => {
    const res = await request(app)
      .post("/api/v1/recaps")
      .set(CSRF)
      .set(as("ADMIN"))
      .send({ ...validBody, process: { total: 10, export: 11 } });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual({ "process.export": ["exceeds_total"] });
  });

  it("method tidak dikenal: 400", async () => {
    const res = await request(app).post("/api/v1/recaps?method=asal").set(CSRF).set(as("ADMIN")).send(validBody);
    expect(res.status).toBe(400);
  });

  it("lebih dari 2 desimal atau negatif: 400", async () => {
    const res = await request(app)
      .post("/api/v1/recaps")
      .set(CSRF)
      .set(as("ADMIN"))
      .send({ ...validBody, process: { total: 10.123, export: -1 } });
    expect(res.status).toBe(400);
  });

  it("section wajib lengkap saat create: 400", async () => {
    const { stock: _stock, ...withoutStock } = validBody;
    const res = await request(app).post("/api/v1/recaps").set(CSRF).set(as("ADMIN")).send(withoutStock);
    expect(res.status).toBe(400);
  });

  it("tanggal sudah ada: 409", async () => {
    db.dailyRecap.findUnique.mockResolvedValue(storedRecap("2026-10-16"));
    const res = await request(app).post("/api/v1/recaps").set(CSRF).set(as("ADMIN")).send(validBody);
    expect(res.status).toBe(409);
    expect(db.dailyRecap.create).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/v1/recaps/:date", () => {
  it("hanya section yang dikirim yang diubah", async () => {
    db.dailyRecap.findUnique.mockResolvedValue(storedRecap("2026-10-16"));
    const res = await request(app)
      .patch("/api/v1/recaps/2026-10-16?method=export_local")
      .set(CSRF)
      .set(as("ADMIN"))
      .send({ stock: { export: 19500, local: 13649.8 } });
    expect(res.status).toBe(200);
    const data = db.dailyRecap.update.mock.calls[0]![0].data;
    expect(Object.keys(data).filter((k) => data[k] !== undefined).sort()).toEqual(
      ["stockExport", "stockLocal", "stockTotal"],
    );
    expect(res.body.data.stock.total).toBe(33149.8);
    expect(res.body.data.process.total).toBe(7862.3);
    const log = db.auditLog.create.mock.calls[0]![0].data;
    expect(log.before.stock.export).toBe(19477.6);
    expect(log.after.stock.export).toBe(19500);
  });

  it("body kosong: 400", async () => {
    const res = await request(app).patch("/api/v1/recaps/2026-10-16").set(CSRF).set(as("ADMIN")).send({});
    expect(res.status).toBe(400);
  });

  it("tidak ada: 404", async () => {
    db.dailyRecap.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .patch("/api/v1/recaps/2026-10-16")
      .set(CSRF)
      .set(as("ADMIN"))
      .send({ note: "x" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/v1/recaps/:date", () => {
  it("ADMIN boleh menghapus, tercatat di audit log", async () => {
    db.dailyRecap.findUnique.mockResolvedValue(storedRecap("2026-10-16"));
    const res = await request(app).delete("/api/v1/recaps/2026-10-16").set(CSRF).set(as("ADMIN"));
    expect(res.status).toBe(204);
    expect(db.auditLog.create.mock.calls[0]![0].data).toMatchObject({ action: "delete", entity: "DailyRecap" });
  });

  it("VIEWER: 403", async () => {
    const res = await request(app).delete("/api/v1/recaps/2026-10-16").set(CSRF).set(as("VIEWER"));
    expect(res.status).toBe(403);
  });
});

describe("price-rates", () => {
  it("ADMIN boleh melihat, tidak boleh membuat", async () => {
    expect((await request(app).get("/api/v1/price-rates").set(as("ADMIN"))).status).toBe(200);
    const res = await request(app)
      .post("/api/v1/price-rates")
      .set(CSRF)
      .set(as("ADMIN"))
      .send({ effectiveFrom: "2026-11-01", pricePerKg: 2700 });
    expect(res.status).toBe(403);
  });

  it("VIEWER tidak boleh melihat", async () => {
    expect((await request(app).get("/api/v1/price-rates").set(as("VIEWER"))).status).toBe(403);
  });

  it("OWNER membuat tarif, tercatat di audit log", async () => {
    db.priceRate.create.mockImplementation(async ({ data }) => ({ ...RATE, id: "rate-2", ...data }));
    const res = await request(app)
      .post("/api/v1/price-rates")
      .set(CSRF)
      .set(as("OWNER"))
      .send({ effectiveFrom: "2026-11-01", pricePerKg: 2700 });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ effectiveFrom: "2026-11-01", pricePerKg: 2700 });
    expect(db.auditLog.create.mock.calls[0]![0].data).toMatchObject({ action: "create", entity: "PriceRate" });
  });

  it("harga bukan bilangan bulat: 400", async () => {
    const res = await request(app)
      .post("/api/v1/price-rates")
      .set(CSRF)
      .set(as("OWNER"))
      .send({ effectiveFrom: "2026-11-01", pricePerKg: 2500.5 });
    expect(res.status).toBe(400);
  });
});

describe("audit-logs", () => {
  it("ADMIN: 403", async () => {
    expect((await request(app).get("/api/v1/audit-logs").set(as("ADMIN"))).status).toBe(403);
  });

  it("OWNER: daftar dengan paginasi", async () => {
    db.auditLog.findMany.mockResolvedValue([]);
    db.auditLog.count.mockResolvedValue(0);
    const res = await request(app).get("/api/v1/audit-logs?limit=10&to=2026-10-16").set(as("OWNER"));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ items: [], page: 1, limit: 10, total: 0 });
    // "to" inklusif: batas atas adalah awal hari berikutnya.
    expect(db.auditLog.findMany.mock.calls[0]![0].where.createdAt.lt).toEqual(day("2026-10-17"));
  });
});

describe("export dan import Excel", () => {
  const ASSET = path.join(__dirname, "..", "assets", "Data Global Oktober 2026.xlsx");

  it("export: VIEWER boleh, file xlsx dengan nama bulan", async () => {
    db.dailyRecap.findMany.mockResolvedValue([storedRecap("2026-10-16")]);
    const res = await request(app).get("/api/v1/recaps/export?month=2026-10").set(as("VIEWER"));
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("spreadsheetml");
    expect(res.headers["content-disposition"]).toContain("Rekap-2026-10.xlsx");
  });

  it("template: ADMIN dapat file xlsx kosong, VIEWER 403", async () => {
    const res = await request(app).get("/api/v1/recaps/template?month=2026-10").set(as("ADMIN"));
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("spreadsheetml");
    expect(res.headers["content-disposition"]).toContain("Template-Rekap-2026-10.xlsx");

    const viewer = await request(app).get("/api/v1/recaps/template?month=2026-10").set(as("VIEWER"));
    expect(viewer.status).toBe(403);
  });

  it("import: VIEWER 403", async () => {
    const res = await request(app)
      .post("/api/v1/recaps/import?month=2026-10")
      .set(CSRF)
      .set(as("VIEWER"))
      // File kecil: server menolak sebelum membaca body, file besar membuat koneksi direset di tengah upload.
      .attach("file", Buffer.from("x"), "rekap.xlsx");
    expect(res.status).toBe(403);
  });

  it("import tanpa file: 400", async () => {
    const res = await request(app).post("/api/v1/recaps/import?month=2026-10").set(CSRF).set(as("ADMIN"));
    expect(res.status).toBe(400);
    expect(res.body.error.fields.file).toBeDefined();
  });

  it("import file bukan xlsx: 400", async () => {
    const res = await request(app)
      .post("/api/v1/recaps/import?month=2026-10")
      .set(CSRF)
      .set(as("ADMIN"))
      .attach("file", Buffer.from("a,b"), "data.csv");
    expect(res.status).toBe(400);
  });

  it("dryRun: pratinjau tanpa menyimpan", async () => {
    db.dailyRecap.findMany.mockResolvedValue([]);
    const res = await request(app)
      .post("/api/v1/recaps/import?month=2026-10&dryRun=true")
      .set(CSRF)
      .set(as("ADMIN"))
      .attach("file", ASSET);
    expect(res.status).toBe(200);
    expect(res.body.data.summary).toEqual({ create: 16, update: 0, skip: 0, unchanged: 0 });
    expect(res.body.data.rows[15].process).toEqual({ total: 7862.3, export: 4355.9, local: 3506.4 });
    expect(db.dailyRecap.createManyAndReturn).not.toHaveBeenCalled();
  });

  it("tanggal yang sudah ada: unchanged kalau sama, skip kalau beda (default)", async () => {
    db.dailyRecap.findMany.mockResolvedValue([
      storedRecap("2026-10-16"),
      storedRecap("2026-10-15", { processTotal: D(1) }),
    ]);
    db.dailyRecap.createManyAndReturn.mockImplementation(async ({ data }) =>
      data.map((d: Record<string, unknown>, i: number) => ({ ...storedRecap("2026-10-01"), ...d, id: `new-${i}` })),
    );
    const res = await request(app)
      .post("/api/v1/recaps/import?month=2026-10")
      .set(CSRF)
      .set(as("ADMIN"))
      .attach("file", ASSET);
    expect(res.status).toBe(201);
    expect(res.body.data.summary).toEqual({ create: 14, update: 0, skip: 1, unchanged: 1 });
    expect(db.dailyRecap.update).not.toHaveBeenCalled();
    const logs = db.auditLog.createMany.mock.calls[0]![0].data;
    expect(logs).toHaveLength(14);
    expect(logs[0]).toMatchObject({ action: "import", entity: "DailyRecap", userId: USER_ID });
  });

  it("onConflict=overwrite: tanggal yang beda ditimpa dan dicatat", async () => {
    db.dailyRecap.findMany.mockResolvedValue([storedRecap("2026-10-15", { processTotal: D(1) })]);
    db.dailyRecap.createManyAndReturn.mockResolvedValue([]);
    const res = await request(app)
      .post("/api/v1/recaps/import?month=2026-10&onConflict=overwrite")
      .set(CSRF)
      .set(as("ADMIN"))
      .attach("file", ASSET);
    expect(res.body.data.summary.update).toBe(1);
    expect(db.dailyRecap.update).toHaveBeenCalledTimes(1);
    const log = db.auditLog.createMany.mock.calls[0]![0].data.at(-1);
    expect(log.before.process.total).toBe(1);
  });

  it("bulan tidak cocok dengan sheet: 400, tidak ada yang disimpan", async () => {
    const res = await request(app)
      .post("/api/v1/recaps/import?month=2026-09")
      .set(CSRF)
      .set(as("ADMIN"))
      .attach("file", ASSET);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("import_invalid");
    expect(db.dailyRecap.findMany).not.toHaveBeenCalled();
  });
});

describe("dashboard", () => {
  it("tanpa login: 401", async () => {
    expect((await request(app).get("/api/v1/dashboard/summary")).status).toBe(401);
  });

  it.each(["summary?month=2026-10", "daily?month=2026-10", "monthly?to=2026-10&months=3"])(
    "VIEWER boleh membuka %s tanpa field pemasukan",
    async (path) => {
      db.dailyRecap.findMany.mockResolvedValue([storedRecap("2026-10-16")]);
      const res = await request(app).get(`/api/v1/dashboard/${path}`).set(as("VIEWER"));
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toMatch(/income/);
    },
  );

  it("tanpa query bulan: memakai bulan berjalan", async () => {
    db.dailyRecap.findMany.mockResolvedValue([]);
    const res = await request(app).get("/api/v1/dashboard/summary").set(as("ADMIN"));
    expect(res.status).toBe(200);
    expect(res.body.data.month).toMatch(/^\d{4}-\d{2}$/);
  });

  it("jumlah bulan tren di luar batas: 400", async () => {
    expect((await request(app).get("/api/v1/dashboard/monthly?months=37").set(as("ADMIN"))).status).toBe(400);
  });
});

describe("expenses", () => {
  const CREATOR = { id: USER_ID, username: "u", name: "U" };
  const storedExpense = (over: Record<string, unknown> = {}) => ({
    id: "exp-1",
    date: day("2026-10-16"),
    category: "Solar",
    amount: 500_000,
    note: null,
    createdById: USER_ID,
    createdBy: CREATOR,
    createdAt: day("2026-10-16"),
    updatedAt: day("2026-10-16"),
    ...over,
  });

  beforeEach(() => {
    db.expense.create.mockImplementation(async ({ data }) => storedExpense({ ...data, id: "exp-new" }));
    db.expense.update.mockImplementation(async ({ data }) =>
      storedExpense(Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))),
    );
  });

  it("VIEWER tidak boleh melihat maupun mencatat", async () => {
    expect((await request(app).get("/api/v1/expenses?month=2026-10").set(as("VIEWER"))).status).toBe(403);
    const res = await request(app)
      .post("/api/v1/expenses")
      .set(CSRF)
      .set(as("VIEWER"))
      .send({ date: "2026-10-16", category: "Solar", amount: 1 });
    expect(res.status).toBe(403);
  });

  it("ADMIN mencatat: spasi dirapikan, ejaan kategori mengikuti yang sudah ada, tercatat di audit log", async () => {
    db.expense.findFirst.mockResolvedValue({ category: "Solar" });
    const res = await request(app)
      .post("/api/v1/expenses")
      .set(CSRF)
      .set(as("ADMIN"))
      .send({ date: "2026-10-16", category: "  solar  ", amount: 500_000, note: "kapal 2" });
    expect(res.status).toBe(201);
    expect(db.expense.findFirst.mock.calls[0]![0].where.category).toEqual({ equals: "solar", mode: "insensitive" });
    expect(db.expense.create.mock.calls[0]![0].data).toMatchObject({ category: "Solar", amount: 500_000, createdById: USER_ID });
    expect(res.body.data).toMatchObject({ date: "2026-10-16", category: "Solar", createdBy: CREATOR });
    expect(db.auditLog.create.mock.calls[0]![0].data).toMatchObject({ action: "create", entity: "Expense" });
  });

  it("kategori baru dipakai apa adanya", async () => {
    db.expense.findFirst.mockResolvedValue(null);
    await request(app)
      .post("/api/v1/expenses")
      .set(CSRF)
      .set(as("OWNER"))
      .send({ date: "2026-10-16", category: "Perbaikan   mesin", amount: 1_000 });
    expect(db.expense.create.mock.calls[0]![0].data.category).toBe("Perbaikan mesin");
  });

  it.each([
    ["jumlah 0", { amount: 0 }],
    ["jumlah desimal", { amount: 1500.5 }],
    ["kategori kosong", { category: "   " }],
    ["field asing", { foo: 1 }],
  ])("validasi: %s -> 400", async (_label, over) => {
    const res = await request(app)
      .post("/api/v1/expenses")
      .set(CSRF)
      .set(as("ADMIN"))
      .send({ date: "2026-10-16", category: "Solar", amount: 1_000, ...over });
    expect(res.status).toBe(400);
  });

  it("daftar bulanan dengan total dan rekap per kategori", async () => {
    db.expense.findMany.mockResolvedValue([
      storedExpense(),
      storedExpense({ id: "exp-2", category: "Listrik", amount: 200_000 }),
      storedExpense({ id: "exp-3", amount: 100_000 }),
    ]);
    const res = await request(app).get("/api/v1/expenses?month=2026-10").set(as("ADMIN"));
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(800_000);
    expect(res.body.data.byCategory).toEqual([
      { category: "Solar", total: 600_000, count: 2 },
      { category: "Listrik", total: 200_000, count: 1 },
    ]);
  });

  it("daftar kategori untuk autocomplete", async () => {
    db.expense.groupBy.mockResolvedValue([{ category: "Solar", _count: { _all: 5 }, _max: { date: day("2026-10-16") } }]);
    const res = await request(app).get("/api/v1/expenses/categories").set(as("ADMIN"));
    expect(res.body.data).toEqual([{ category: "Solar", count: 5, lastUsed: "2026-10-16" }]);
  });

  it("update mencatat nilai sebelum dan sesudah", async () => {
    db.expense.findUnique.mockResolvedValue(storedExpense());
    db.expense.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .patch("/api/v1/expenses/exp-1")
      .set(CSRF)
      .set(as("ADMIN"))
      .send({ amount: 450_000 });
    expect(res.status).toBe(200);
    const log = db.auditLog.create.mock.calls[0]![0].data;
    expect(log.before.amount).toBe(500_000);
    expect(log.after.amount).toBe(450_000);
  });

  it("hapus yang tidak ada: 404", async () => {
    db.expense.findUnique.mockResolvedValue(null);
    expect((await request(app).delete("/api/v1/expenses/nope").set(CSRF).set(as("ADMIN"))).status).toBe(404);
  });

  it("rekap bulanan ADMIN memuat pengeluaran dan laba", async () => {
    db.dailyRecap.findMany.mockResolvedValue([storedRecap("2026-10-16")]);
    db.expense.findMany.mockResolvedValue([{ date: day("2026-10-16"), category: "Solar", amount: 655_750 }]);
    const res = await request(app).get("/api/v1/recaps?month=2026-10").set(as("ADMIN"));
    expect(res.body.data.total).toMatchObject({ income: 19_655_750, expense: 655_750, profit: 19_000_000 });
    expect(res.body.data.days[15].expense).toBe(655_750);
  });

  it("rekap bulanan VIEWER: pengeluaran tidak diambil dari database", async () => {
    db.dailyRecap.findMany.mockResolvedValue([storedRecap("2026-10-16")]);
    const res = await request(app).get("/api/v1/recaps?month=2026-10").set(as("VIEWER"));
    expect(JSON.stringify(res.body)).not.toMatch(/expense|profit/);
    expect(db.expense.findMany).not.toHaveBeenCalled();
  });
});
